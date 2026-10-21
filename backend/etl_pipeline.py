#!/usr/bin/env python3
"""
GridironLens — AWS x NFL Hackathon Data Ingestion & Cross-Source Join Pipeline
Links Regional Event Data (Next Gen Stats tracking), nflverse (PBP + IDs),
and Pro Football Reference (PFR Combine + Seasonal Advanced Stats).
Stores clean, indexed tables in DuckDB and exports pre-cached Golden Demo Play bundles.
"""

import os
import sys
import json
import math
import glob
import time
import requests
import duckdb
import numpy as np
import pandas as pd

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGIONAL_DIR = os.path.join(BASE_DIR, "nfl-big-data-bowl-regional-event-data", "data")
DATA_RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
DATA_PROC_DIR = os.path.join(BASE_DIR, "data", "processed")
GOLDEN_DIR = os.path.join(DATA_PROC_DIR, "golden_plays")
DUCKDB_PATH = os.path.join(DATA_PROC_DIR, "gridiron.duckdb")

os.makedirs(DATA_RAW_DIR, exist_ok=True)
os.makedirs(DATA_PROC_DIR, exist_ok=True)
os.makedirs(GOLDEN_DIR, exist_ok=True)

# nflverse Parquet URLs
NFLVERSE_URLS = {
    "players.parquet": "https://github.com/nflverse/nflverse-data/releases/download/players/players.parquet",
    "combine.parquet": "https://github.com/nflverse/nflverse-data/releases/download/combine/combine.parquet",
    "pfr_pass.parquet": "https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_pass.parquet",
    "pfr_rec.parquet": "https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_rec.parquet",
    "pfr_rush.parquet": "https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_rush.parquet",
    "pfr_def.parquet": "https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_def.parquet",
    "pbp_2021.parquet": "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2021.parquet",
}


def download_remote_assets():
    """Download and cache required nflverse & PFR datasets if not already cached."""
    print("[ETL] Step 1: Checking nflverse and PFR remote assets...")
    for filename, url in NFLVERSE_URLS.items():
        dest = os.path.join(DATA_RAW_DIR, filename)
        if not os.path.exists(dest):
            print(f"  -> Downloading {filename} from {url}...")
            resp = requests.get(url, stream=True, timeout=30)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            print(f"  ✓ Cached {filename} ({os.path.getsize(dest) / 1024 / 1024:.2f} MB)")
        else:
            print(f"  ✓ Found local {filename} ({os.path.getsize(dest) / 1024 / 1024:.2f} MB)")


def standardize_tracking_coordinates(df):
    """
    Standardize tracking coordinates so offensive team always drives left-to-right (x: 0->120, y: 0->53.3).
    Flips x, y, o, and dir when playDirection == 'left'.
    Converts speed s (yd/s) to speed_mph = round(s * 2.04545, 2).
    """
    is_left = df["playDirection"] == "left"
    
    # Standardize X and Y
    df["x_std"] = np.where(is_left, 120.0 - df["x"], df["x"])
    df["y_std"] = np.where(is_left, (160.0 / 3.0) - df["y"], df["y"])
    
    # Standardize Orientation and Direction (180 degree flip)
    df["o_std"] = np.where(is_left, (df["o"] + 180.0) % 360.0, df["o"])
    df["dir_std"] = np.where(is_left, (df["dir"] + 180.0) % 360.0, df["dir"])
    
    # Convert speed to MPH
    df["speed_mph"] = (df["s"] * 2.04545).round(2)
    return df


def compute_pairwise_distances(play_trk, possession_team, defensive_team):
    """
    Compute frame-by-frame Euclidean distances:
    - Distance to football (dist_to_ball)
    - Distance to closest opponent (nearest_opp_dist)
    """
    frames = []
    
    # Group by frameId
    for frame_id, frame_df in play_trk.groupby("frameId"):
        # Football location
        ball_row = frame_df[frame_df["team"] == "football"]
        ball_x = ball_row["x_std"].values[0] if len(ball_row) > 0 else None
        ball_y = ball_row["y_std"].values[0] if len(ball_row) > 0 else None
        
        off_df = frame_df[frame_df["team"] == possession_team]
        def_df = frame_df[frame_df["team"] == defensive_team]
        
        frame_copy = frame_df.copy()
        
        # Distance to ball
        if ball_x is not None and ball_y is not None:
            dx_ball = frame_copy["x_std"] - ball_x
            dy_ball = frame_copy["y_std"] - ball_y
            frame_copy["dist_to_ball"] = np.round(np.sqrt(dx_ball**2 + dy_ball**2), 2)
        else:
            frame_copy["dist_to_ball"] = np.nan

        # Distance to nearest opponent
        nearest_dists = []
        for _, row in frame_copy.iterrows():
            if row["team"] == "football":
                nearest_dists.append(0.0)
                continue
            
            opp_df = def_df if row["team"] == possession_team else off_df
            if len(opp_df) > 0:
                dx = opp_df["x_std"] - row["x_std"]
                dy = opp_df["y_std"] - row["y_std"]
                min_d = np.sqrt(dx**2 + dy**2).min()
                nearest_dists.append(round(float(min_d), 2))
            else:
                nearest_dists.append(np.nan)
                
        frame_copy["nearest_opp_dist"] = nearest_dists
        frames.append(frame_copy)

    if frames:
        return pd.concat(frames, ignore_index=True)
    return play_trk


def compute_combine_percentiles(combine_df):
    """
    Compute empirical percentiles for combine drills by position group.
    Drills where lower is better: forty, cone, shuttle.
    Drills where higher is better: vertical, broad_jump, bench.
    """
    stats_cols = ["forty", "vertical", "broad_jump", "cone", "shuttle", "bench"]
    percentile_records = []
    
    for pos, pos_df in combine_df.groupby("pos"):
        if len(pos_df) < 5:
            continue
        for col in stats_cols:
            valid = pos_df[col].dropna()
            if len(valid) >= 5:
                percentile_records.append({
                    "pos": pos,
                    "metric": col,
                    "p10": float(valid.quantile(0.10)),
                    "p25": float(valid.quantile(0.25)),
                    "p50": float(valid.median()),
                    "p75": float(valid.quantile(0.75)),
                    "p90": float(valid.quantile(0.90)),
                    "count": int(len(valid)),
                    "lower_is_better": col in ["forty", "cone", "shuttle"]
                })
    return pd.DataFrame(percentile_records)


def run_pipeline():
    print("=========================================================")
    print("      GRIDIRONLENS: ETL & CROSS-SOURCE JOIN PIPELINE     ")
    print("=========================================================")
    t_start = time.time()
    
    # Step 1: Ensure cached assets
    download_remote_assets()
    
    # Step 2: Ingest Regional Tables
    print("\n[ETL] Step 2: Loading Regional Event CSVs...")
    games_csv = os.path.join(REGIONAL_DIR, "games.csv")
    plays_csv = os.path.join(REGIONAL_DIR, "plays.csv")
    players_csv = os.path.join(REGIONAL_DIR, "players.csv")
    pff_csv = os.path.join(REGIONAL_DIR, "pffScoutingData.csv")
    
    games_df = pd.read_csv(games_csv)
    plays_df = pd.read_csv(plays_csv)
    players_df = pd.read_csv(players_csv)
    pff_df = pd.read_csv(pff_csv)
    print(f"  ✓ Loaded {len(games_df)} games, {len(plays_df)} plays, {len(players_df)} players, {len(pff_df)} pff assignments")
    
    # Step 3: Ingest nflverse Data
    print("\n[ETL] Step 3: Loading nflverse play-by-play and player IDs...")
    pbp_path = os.path.join(DATA_RAW_DIR, "pbp_2021.parquet")
    pbp_cols = [
        "old_game_id", "play_id", "epa", "wpa", "wp", "def_wp", "home_wp", "away_wp",
        "cpoe", "air_yards", "yards_after_catch", "success", "pass_oe", "xpass",
        "passer", "receiver", "rusher", "pass_length", "pass_location",
        "temp", "wind", "roof", "surface"
    ]
    pbp_df = pd.read_parquet(pbp_path, columns=pbp_cols)
    pbp_df["old_game_id_num"] = pd.to_numeric(pbp_df["old_game_id"], errors="coerce")
    pbp_df["play_id_num"] = pd.to_numeric(pbp_df["play_id"], errors="coerce")
    
    # Join Regional Plays + nflverse PBP
    joined_plays = plays_df.merge(
        pbp_df,
        left_on=["gameId", "playId"],
        right_on=["old_game_id_num", "play_id_num"],
        how="left"
    )
    print(f"  ✓ Joined plays table created: {len(joined_plays)} plays with nflverse EPA/WPA/CPOE")

    # Step 4: Ingest Player Bridge & Pro Football Reference (PFR) Data
    print("\n[ETL] Step 4: Loading PFR Combine & Seasonal Advanced Stats...")
    nv_players_path = os.path.join(DATA_RAW_DIR, "players.parquet")
    combine_path = os.path.join(DATA_RAW_DIR, "combine.parquet")
    pfr_pass_path = os.path.join(DATA_RAW_DIR, "pfr_pass.parquet")
    pfr_rec_path = os.path.join(DATA_RAW_DIR, "pfr_rec.parquet")
    pfr_rush_path = os.path.join(DATA_RAW_DIR, "pfr_rush.parquet")
    pfr_def_path = os.path.join(DATA_RAW_DIR, "pfr_def.parquet")
    
    nv_players = pd.read_parquet(
        nv_players_path,
        columns=["nfl_id", "gsis_id", "pfr_id", "display_name", "position", "position_group", "headshot", "college_name"]
    )
    nv_players["nfl_id_num"] = pd.to_numeric(nv_players["nfl_id"], errors="coerce")
    
    # Merge Regional players with nflverse IDs
    joined_players = players_df.merge(
        nv_players,
        left_on="nflId",
        right_on="nfl_id_num",
        how="left"
    )
    
    # Load Combine
    combine_df = pd.read_parquet(combine_path)
    percentiles_df = compute_combine_percentiles(combine_df)
    
    # Load 2021 PFR Seasonal Advanced Stats
    pfr_pass = pd.read_parquet(pfr_pass_path)
    pfr_pass_2021 = pfr_pass[pfr_pass["season"] == 2021] if "season" in pfr_pass.columns else pfr_pass
    
    pfr_rec = pd.read_parquet(pfr_rec_path)
    pfr_rec_2021 = pfr_rec[pfr_rec["season"] == 2021] if "season" in pfr_rec.columns else pfr_rec
    
    pfr_rush = pd.read_parquet(pfr_rush_path)
    pfr_rush_2021 = pfr_rush[pfr_rush["season"] == 2021] if "season" in pfr_rush.columns else pfr_rush
    
    pfr_def = pd.read_parquet(pfr_def_path)
    pfr_def_2021 = pfr_def[pfr_def["season"] == 2021] if "season" in pfr_def.columns else pfr_def
    
    print(f"  ✓ PFR stats ready: Combine {len(combine_df)}, Pass {len(pfr_pass_2021)}, Rec {len(pfr_rec_2021)}, Rush {len(pfr_rush_2021)}, Def {len(pfr_def_2021)}")

    # Step 5: Ingest Tracking Data (Featured Games)
    print("\n[ETL] Step 5: Loading Tracking data & normalizing coordinates...")
    tracking_files = sorted(glob.glob(os.path.join(REGIONAL_DIR, "tracking", "tracking_*.csv")))
    # Focus on the kickoff game 2021090900 (TB vs DAL) and additional games for broad exploratory querying
    featured_game_files = [f for f in tracking_files if any(gid in f for gid in ["2021090900", "2021091200", "2021091201"])]
    print(f"  -> Ingesting tracking for featured games: {[os.path.basename(f) for f in featured_game_files]}")
    
    tracking_dfs = []
    for tf in featured_game_files:
        df = pd.read_csv(tf)
        df = standardize_tracking_coordinates(df)
        tracking_dfs.append(df)
    
    all_tracking = pd.concat(tracking_dfs, ignore_index=True)
    print(f"  ✓ Standardized tracking frames: {len(all_tracking):,} rows across {all_tracking['playId'].nunique()} plays")

    # Step 6: Initialize DuckDB & Persist
    print("\n[ETL] Step 6: Initializing DuckDB database at data/processed/gridiron.duckdb...")
    if os.path.exists(DUCKDB_PATH):
        os.remove(DUCKDB_PATH)
        
    con = duckdb.connect(DUCKDB_PATH)
    
    # Register and create tables
    con.register("games_tmp", games_df)
    con.execute("CREATE TABLE games AS SELECT * FROM games_tmp")
    
    con.register("plays_tmp", joined_plays)
    con.execute("CREATE TABLE plays AS SELECT * FROM plays_tmp")
    
    con.register("players_tmp", joined_players)
    con.execute("CREATE TABLE players AS SELECT * FROM players_tmp")
    
    con.register("pff_tmp", pff_df)
    con.execute("CREATE TABLE player_play AS SELECT * FROM pff_tmp")
    
    con.register("combine_tmp", combine_df)
    con.execute("CREATE TABLE pfr_combine AS SELECT * FROM combine_tmp")
    
    con.register("percentiles_tmp", percentiles_df)
    con.execute("CREATE TABLE pfr_combine_percentiles AS SELECT * FROM percentiles_tmp")
    
    con.register("pfr_pass_tmp", pfr_pass_2021)
    con.execute("CREATE TABLE pfr_adv_pass AS SELECT * FROM pfr_pass_tmp")
    
    con.register("pfr_rec_tmp", pfr_rec_2021)
    con.execute("CREATE TABLE pfr_adv_rec AS SELECT * FROM pfr_rec_tmp")
    
    con.register("pfr_rush_tmp", pfr_rush_2021)
    con.execute("CREATE TABLE pfr_adv_rush AS SELECT * FROM pfr_rush_tmp")
    
    con.register("pfr_def_tmp", pfr_def_2021)
    con.execute("CREATE TABLE pfr_adv_def AS SELECT * FROM pfr_def_tmp")
    
    con.register("tracking_tmp", all_tracking)
    con.execute("CREATE TABLE tracking AS SELECT * FROM tracking_tmp")
    
    # Create indexes for sub-millisecond queries
    con.execute("CREATE INDEX idx_plays_game ON plays(gameId, playId)")
    con.execute("CREATE INDEX idx_tracking_play ON tracking(gameId, playId, frameId)")
    con.execute("CREATE INDEX idx_pff_play ON player_play(gameId, playId, nflId)")
    con.execute("CREATE INDEX idx_players_nflid ON players(nflId)")
    
    print("  ✓ Created indexed DuckDB tables: games, plays, players, player_play, pfr_combine, tracking, etc.")

    # Step 7: Export 3 Curated Golden Demo Plays
    print("\n[ETL] Step 7: Exporting 3 Curated Golden Demo Plays with pre-computed distances & metrics...")
    
    # 3 Golden Plays in Game 2021090900 (TB vs DAL):
    # 1. Play 2032: Explosive Pass Play (Brady 47yd TD to Antonio Brown, +4.52 EPA, 45 Air Yards, 73% CPOE)
    # 2. Play 3110: High-Motion Scheme (Pre-snap man_in_motion, shift, quick pass to Fournette)
    # 3. Play 2279: Defensive Sack / TFL (Shaquil Barrett sacks Dak Prescott for -12 yards, -1.34 EPA)
    golden_plays_meta = [
        {
            "id": "play_2032",
            "gameId": 2021090900,
            "playId": 2032,
            "title": "Explosive 47-Yard Deep TD Pass",
            "category": "explosive_pass",
            "badge": "Explosive Pass (+4.52 EPA)",
            "subtitle": "Tom Brady 47-yd deep bomb TD to Antonio Brown (Q2 2:45)",
            "focusNflId": 35481, # Antonio Brown or Tom Brady
            "focusPlayerName": "Antonio Brown",
            "focusJersey": 81,
            "keyFrame": 41, # pass release / catch
            "description": "(2:45) (No Huddle, Shotgun) T.Brady pass deep right to A.Brown for 47 yards, TOUCHDOWN."
        },
        {
            "id": "play_3110",
            "gameId": 2021090900,
            "playId": 3110,
            "title": "Pre-Snap Motion Scheme",
            "category": "motion_run",
            "badge": "Pre-Snap Motion & Target",
            "subtitle": "Pre-snap jet motion into quick swing pass to Leonard Fournette",
            "focusNflId": 44850, # Leonard Fournette
            "focusPlayerName": "Leonard Fournette",
            "focusJersey": 28,
            "keyFrame": 35, # snap / motion transition
            "description": "(7:12) (Shotgun) T.Brady pass short left to L.Fournette to DAL 11 for 2 yards (M.Parsons)."
        },
        {
            "id": "play_2279",
            "gameId": 2021090900,
            "playId": 2279,
            "title": "Defensive Edge Rush Sack (-12 Yds)",
            "category": "defensive_sack",
            "badge": "Defensive Sack (-1.34 EPA)",
            "subtitle": "Shaquil Barrett speed rush off the edge sacks Dak Prescott for -12 yards",
            "focusNflId": 41334, # Shaquil Barrett
            "focusPlayerName": "Shaquil Barrett",
            "focusJersey": 58,
            "keyFrame": 52, # sack impact
            "description": "(1:11) (Shotgun) D.Prescott sacked at TB 33 for -12 yards (S.Barrett)."
        }
    ]

    # Pre-compute combine vs in-game speed benchmark points across all players
    # Find max tracked speed for each player in game 2021090900
    trk_speeds = all_tracking.groupby("nflId")["speed_mph"].max().reset_index()
    trk_speeds.columns = ["nflId", "max_game_speed_mph"]
    
    # Merge with players and combine
    speed_scatter = trk_speeds.merge(joined_players, on="nflId").merge(
        combine_df[["pfr_id", "forty", "vertical", "broad_jump"]].dropna(subset=["forty"]).drop_duplicates("pfr_id"),
        on="pfr_id",
        how="inner"
    )
    speed_scatter_data = []
    for _, r in speed_scatter.iterrows():
        speed_scatter_data.append({
            "nflId": int(r["nflId"]),
            "displayName": str(r["displayName"]),
            "position": str(r["officialPosition"]),
            "forty": float(r["forty"]),
            "maxGameSpeedMph": float(r["max_game_speed_mph"]),
            "vertical": float(r["vertical"]) if pd.notnull(r["vertical"]) else None,
            "broadJump": float(r["broad_jump"]) if pd.notnull(r["broad_jump"]) else None,
        })
    print(f"  ✓ Generated Combine vs In-Game Speed scatter points: {len(speed_scatter_data)} players")

    # Scheme / Formation matrix across all plays
    formation_matrix = joined_plays.groupby(["offenseFormation", "pff_passCoverage"]).agg(
        play_count=("playId", "count"),
        avg_epa=("epa", "mean"),
        avg_cpoe=("cpoe", "mean"),
        success_rate=("success", "mean")
    ).reset_index().dropna()
    
    formation_matrix_list = []
    for _, r in formation_matrix.iterrows():
        formation_matrix_list.append({
            "formation": str(r["offenseFormation"]),
            "coverage": str(r["pff_passCoverage"]),
            "playCount": int(r["play_count"]),
            "avgEpa": round(float(r["avg_epa"]), 3),
            "avgCpoe": round(float(r["avg_cpoe"]), 2),
            "successRate": round(float(r["success_rate"]) * 100, 1)
        })

    # Generate each Golden Play bundle
    for gp in golden_plays_meta:
        gid = gp["gameId"]
        pid = gp["playId"]
        
        # 1. Play metadata
        play_row = joined_plays[(joined_plays["gameId"] == gid) & (joined_plays["playId"] == pid)].iloc[0]
        game_row = games_df[games_df["gameId"] == gid].iloc[0]
        
        poss_team = play_row["possessionTeam"]
        def_team = play_row["defensiveTeam"]
        
        # 2. Tracking frames with pairwise distances
        raw_play_trk = all_tracking[(all_tracking["gameId"] == gid) & (all_tracking["playId"] == pid)].copy()
        processed_trk = compute_pairwise_distances(raw_play_trk, poss_team, def_team)
        
        # Sort by frameId
        processed_trk = processed_trk.sort_values(["frameId", "team", "jerseyNumber"])
        
        # 3. Active players assignments from PFF + joined player metadata
        pff_sub = pff_df[(pff_df["gameId"] == gid) & (pff_df["playId"] == pid)].merge(joined_players, on="nflId", how="left")
        
        active_players = []
        for _, pr in pff_sub.iterrows():
            n_id = pr["nflId"]
            pfr_id = pr.get("pfr_id")
            
            # Combine info
            comb_sub = combine_df[combine_df["pfr_id"] == pfr_id] if pd.notnull(pfr_id) else pd.DataFrame()
            comb_row = comb_sub.iloc[0] if len(comb_sub) > 0 else {}
            
            # Combine percentiles
            pos = pr.get("officialPosition", "")
            pos_percentiles = percentiles_df[percentiles_df["pos"] == pos] if pos else pd.DataFrame()
            
            percentile_dict = {}
            for metric in ["forty", "vertical", "broad_jump", "cone", "shuttle", "bench"]:
                val = comb_row.get(metric)
                if pd.notnull(val) and len(pos_percentiles) > 0:
                    metric_p = pos_percentiles[pos_percentiles["metric"] == metric]
                    if len(metric_p) > 0:
                        p_row = metric_p.iloc[0]
                        # Interpolate percentile approx
                        p10, p50, p90 = p_row["p10"], p_row["p50"], p_row["p90"]
                        lower_better = p_row["lower_is_better"]
                        if lower_better:
                            pct = 90 - (val - p10) / (p90 - p10 + 1e-6) * 80
                        else:
                            pct = 10 + (val - p10) / (p90 - p10 + 1e-6) * 80
                        percentile_dict[metric] = round(max(5.0, min(99.0, pct)), 1)
                    else:
                        percentile_dict[metric] = None
                else:
                    percentile_dict[metric] = None
                    
            # Seasonal PFR stats
            adv_pass_sub = pfr_pass_2021[pfr_pass_2021["pfr_id"] == pfr_id] if pd.notnull(pfr_id) else pd.DataFrame()
            adv_rec_sub = pfr_rec_2021[pfr_rec_2021["pfr_id"] == pfr_id] if pd.notnull(pfr_id) else pd.DataFrame()
            adv_rush_sub = pfr_rush_2021[pfr_rush_2021["pfr_id"] == pfr_id] if pd.notnull(pfr_id) else pd.DataFrame()
            adv_def_sub = pfr_def_2021[pfr_def_2021["pfr_id"] == pfr_id] if pd.notnull(pfr_id) else pd.DataFrame()
            
            seasonal_stats = {
                "pocket_time": float(adv_pass_sub["pocket_time"].iloc[0]) if len(adv_pass_sub) > 0 and pd.notnull(adv_pass_sub["pocket_time"].iloc[0]) else None,
                "times_pressured": int(adv_pass_sub["times_pressured"].iloc[0]) if len(adv_pass_sub) > 0 and pd.notnull(adv_pass_sub["times_pressured"].iloc[0]) else None,
                "times_blitzed": int(adv_pass_sub["times_blitzed"].iloc[0]) if len(adv_pass_sub) > 0 and pd.notnull(adv_pass_sub["times_blitzed"].iloc[0]) else None,
                "rec_yac": float(adv_rec_sub["yac"].iloc[0]) if len(adv_rec_sub) > 0 and pd.notnull(adv_rec_sub["yac"].iloc[0]) else None,
                "rec_brk_tkl": int(adv_rec_sub["brk_tkl"].iloc[0]) if len(adv_rec_sub) > 0 and pd.notnull(adv_rec_sub["brk_tkl"].iloc[0]) else None,
                "rush_brk_tkl": int(adv_rush_sub["brk_tkl"].iloc[0]) if len(adv_rush_sub) > 0 and pd.notnull(adv_rush_sub["brk_tkl"].iloc[0]) else None,
                "rush_yac": float(adv_rush_sub["yac"].iloc[0]) if len(adv_rush_sub) > 0 and pd.notnull(adv_rush_sub["yac"].iloc[0]) else None,
                "pressures_def": int(adv_def_sub["pressures"].iloc[0]) if len(adv_def_sub) > 0 and "pressures" in adv_def_sub.columns and pd.notnull(adv_def_sub["pressures"].iloc[0]) else None,
            }
            
            # Max tracked speed in this play
            player_frames = processed_trk[processed_trk["nflId"] == n_id]
            play_peak_speed = float(player_frames["speed_mph"].max()) if len(player_frames) > 0 else 0.0
            play_peak_accel = float(player_frames["a"].max()) if len(player_frames) > 0 else 0.0

            active_players.append({
                "nflId": int(n_id),
                "displayName": str(pr.get("displayName", "")),
                "jerseyNumber": int(player_frames["jerseyNumber"].iloc[0]) if len(player_frames) > 0 and pd.notnull(player_frames["jerseyNumber"].iloc[0]) else None,
                "team": str(player_frames["team"].iloc[0]) if len(player_frames) > 0 else ("TB" if pr.get("pff_role") in ["Pass", "Pass Route", "Pass Block"] else "DAL"),
                "position": str(pr.get("officialPosition", "")),
                "pffRole": str(pr.get("pff_role", "")),
                "pffPositionLinedUp": str(pr.get("pff_positionLinedUp", "")),
                "pffSack": bool(pr.get("pff_sack") == 1),
                "pffHit": bool(pr.get("pff_hit") == 1),
                "pffHurry": bool(pr.get("pff_hurry") == 1),
                "headshotUrl": str(pr.get("headshot", "")) if pd.notnull(pr.get("headshot")) else None,
                "college": str(pr.get("college_name", "")),
                "height": str(pr.get("height", "")),
                "weight": int(pr.get("weight", 0)) if pd.notnull(pr.get("weight")) else None,
                "combine": {
                    "forty": float(comb_row.get("forty")) if pd.notnull(comb_row.get("forty")) else None,
                    "vertical": float(comb_row.get("vertical")) if pd.notnull(comb_row.get("vertical")) else None,
                    "broadJump": float(comb_row.get("broad_jump")) if pd.notnull(comb_row.get("broad_jump")) else None,
                    "cone": float(comb_row.get("cone")) if pd.notnull(comb_row.get("cone")) else None,
                    "shuttle": float(comb_row.get("shuttle")) if pd.notnull(comb_row.get("shuttle")) else None,
                    "bench": float(comb_row.get("bench")) if pd.notnull(comb_row.get("bench")) else None,
                    "draftRound": int(comb_row.get("draft_round")) if pd.notnull(comb_row.get("draft_round")) else None,
                    "draftOvr": int(comb_row.get("draft_ovr")) if pd.notnull(comb_row.get("draft_ovr")) else None,
                    "percentiles": percentile_dict
                },
                "seasonalStats": seasonal_stats,
                "playPeakSpeedMph": round(play_peak_speed, 2),
                "playPeakAccel": round(play_peak_accel, 2)
            })

        # 4. Formats frame sequences as compact objects for 60fps canvas
        frames_list = []
        event_markers = []
        snap_frame_id = None
        
        for f_id, f_group in processed_trk.groupby("frameId"):
            players_in_frame = []
            frame_events = [ev for ev in f_group["event"].dropna().unique() if ev and ev != "None"]
            
            for ev in frame_events:
                event_markers.append({
                    "frameId": int(f_id),
                    "event": str(ev)
                })
                if "ball_snap" in ev:
                    snap_frame_id = int(f_id)

            for _, row in f_group.iterrows():
                is_ball = row["team"] == "football"
                players_in_frame.append({
                    "nflId": None if is_ball else int(row["nflId"]),
                    "team": str(row["team"]),
                    "jersey": None if is_ball else (int(row["jerseyNumber"]) if pd.notnull(row["jerseyNumber"]) else None),
                    "x": round(float(row["x_std"]), 2),
                    "y": round(float(row["y_std"]), 2),
                    "s_mph": round(float(row["speed_mph"]), 2),
                    "a": round(float(row["a"]), 2) if pd.notnull(row["a"]) else 0.0,
                    "o": round(float(row["o_std"]), 1) if pd.notnull(row["o_std"]) else 0.0,
                    "dir": round(float(row["dir_std"]), 1) if pd.notnull(row["dir_std"]) else 0.0,
                    "distBall": round(float(row["dist_to_ball"]), 2) if pd.notnull(row["dist_to_ball"]) else None,
                    "distOpp": round(float(row["nearest_opp_dist"]), 2) if pd.notnull(row["nearest_opp_dist"]) else None,
                    "event": str(row["event"]) if pd.notnull(row["event"]) and row["event"] != "None" else None
                })
                
            frames_list.append({
                "frameId": int(f_id),
                "events": frame_events,
                "players": players_in_frame
            })

        # Deduplicate event markers
        seen_events = set()
        dedup_events = []
        for em in event_markers:
            key = (em["frameId"], em["event"])
            if key not in seen_events:
                seen_events.add(key)
                dedup_events.append(em)

        # Build bundle
        bundle = {
            "meta": gp,
            "context": {
                "gameId": int(gid),
                "playId": int(pid),
                "season": int(game_row["season"]),
                "week": int(game_row["week"]),
                "homeTeam": str(game_row["homeTeamAbbr"]),
                "visitorTeam": str(game_row["visitorTeamAbbr"]),
                "possessionTeam": str(poss_team),
                "defensiveTeam": str(def_team),
                "down": int(play_row["down"]),
                "yardsToGo": int(play_row["yardsToGo"]),
                "yardlineNumber": int(play_row["yardlineNumber"]),
                "yardlineSide": str(play_row["yardlineSide"]),
                "quarter": int(play_row["quarter"]),
                "gameClock": str(play_row["gameClock"]),
                "preSnapHomeScore": int(play_row["preSnapHomeScore"]),
                "preSnapVisitorScore": int(play_row["preSnapVisitorScore"]),
                "playDescription": str(play_row["playDescription"]),
                "playResult": int(play_row["playResult"]),
                # nflverse metrics
                "epa": round(float(play_row["epa"]), 3) if pd.notnull(play_row["epa"]) else None,
                "wpa": round(float(play_row["wpa"]), 4) if pd.notnull(play_row["wpa"]) else None,
                "wp": round(float(play_row["wp"]), 3) if pd.notnull(play_row["wp"]) else None,
                "cpoe": round(float(play_row["cpoe"]), 2) if pd.notnull(play_row["cpoe"]) else None,
                "airYards": float(play_row["air_yards"]) if pd.notnull(play_row["air_yards"]) else None,
                "yac": float(play_row["yards_after_catch"]) if pd.notnull(play_row["yards_after_catch"]) else None,
                "success": bool(play_row["success"] == 1),
                "passResult": str(play_row["passResult"]),
                "passer": str(play_row["passer"]),
                "receiver": str(play_row["receiver"]),
                # Scheme
                "offenseFormation": str(play_row["offenseFormation"]),
                "personnelO": str(play_row["personnelO"]),
                "personnelD": str(play_row["personnelD"]),
                "defendersInBox": int(play_row["defendersInBox"]) if pd.notnull(play_row["defendersInBox"]) else None,
                "coverage": str(play_row["pff_passCoverage"]),
                "coverageType": str(play_row["pff_passCoverageType"]),
                "dropBackType": str(play_row["dropBackType"]),
                "snapFrameId": snap_frame_id or (frames_list[5]["frameId"] if len(frames_list) > 5 else 1)
            },
            "events": dedup_events,
            "players": active_players,
            "frames": frames_list,
            "speedScatterBenchmark": speed_scatter_data,
            "formationMatrix": formation_matrix_list
        }
        
        # Write pre-cached JSON
        json_path = os.path.join(GOLDEN_DIR, f"{gp['id']}.json")
        with open(json_path, "w") as f:
            json.dump(bundle, f, indent=2)
        print(f"  ✓ Exported pre-cached Golden Demo Play: {gp['title']} -> {os.path.basename(json_path)} ({len(frames_list)} frames, {len(active_players)} players)")

    # Manifest for Golden Plays
    manifest_path = os.path.join(GOLDEN_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(golden_plays_meta, f, indent=2)
    print(f"  ✓ Exported Golden Plays manifest to {manifest_path}")

    con.close()
    print(f"\n[ETL] SUCCESS: Pipeline finished in {time.time() - t_start:.2f}s")
    print(f"  Processed Database: {DUCKDB_PATH}")
    print(f"  Pre-cached Bundles: {GOLDEN_DIR}")
    print("=========================================================\n")


if __name__ == "__main__":
    run_pipeline()
