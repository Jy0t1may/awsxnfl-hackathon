#!/usr/bin/env python3
"""
GridironLens — FastAPI Backend
Provides high-performance DuckDB query endpoints for matches, quarters, plays,
and dynamic 10Hz tracking telemetry with nflverse & PFR integration.
"""

import os
import json
import math
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import duckdb
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGIONAL_DIR = os.path.join(BASE_DIR, "nfl-big-data-bowl-regional-event-data", "data")
DATA_PROC_DIR = os.path.join(BASE_DIR, "data", "processed")
GOLDEN_DIR = os.path.join(DATA_PROC_DIR, "golden_plays")
DUCKDB_PATH = os.path.join(DATA_PROC_DIR, "gridiron.duckdb")

app = FastAPI(
    title="GridironLens API",
    description="Interactive visual analytics platform for NFL tracking, nflverse, and PFR data.",
    version="2.0.0"
)

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory bundle cache for instant repeat hits
PLAY_BUNDLE_CACHE: Dict[str, Any] = {}


def get_db():
    """Get a read-only DuckDB connection."""
    if not os.path.exists(DUCKDB_PATH):
        raise HTTPException(status_code=500, detail="Database not initialized. Please run etl_pipeline.py first.")
    return duckdb.connect(DUCKDB_PATH, read_only=True)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database_exists": os.path.exists(DUCKDB_PATH),
    }


@app.get("/api/games")
def list_games():
    """List all available games with formatted dates, days of week, and week numbers."""
    con = get_db()
    try:
        query = """
            SELECT gameId, season, week, gameDate, gameTimeEastern, homeTeamAbbr, visitorTeamAbbr
            FROM games
            ORDER BY season ASC, week ASC, gameDate ASC, gameTimeEastern ASC
        """
        rows = con.execute(query).fetchall()
        cols = [col[0] for col in con.description]
        
        games = []
        for row in rows:
            g = dict(zip(cols, row))
            # Format date e.g. "09/09/2021" -> "Thu, Sep 09, 2021"
            date_str = g.get("gameDate", "")
            formatted_date = date_str
            day_of_week = ""
            try:
                dt = datetime.strptime(date_str, "%m/%d/%Y")
                day_of_week = dt.strftime("%a")
                formatted_date = dt.strftime("%b %d, %Y")
            except Exception:
                pass
            
            time_str = g.get("gameTimeEastern", "")
            time_display = time_str
            try:
                t_dt = datetime.strptime(time_str, "%H:%M:%S")
                time_display = t_dt.strftime("%I:%M %p")
            except Exception:
                pass

            g["dayOfWeek"] = day_of_week
            g["formattedDate"] = f"{day_of_week}, {formatted_date}" if day_of_week else formatted_date
            g["timeDisplay"] = time_display
            g["matchup"] = f"{g['visitorTeamAbbr']} @ {g['homeTeamAbbr']}"
            g["fullTitle"] = f"Week {g['week']}: {g['matchup']} — {g['formattedDate']} ({time_display})"
            games.append(g)
            
        return games
    finally:
        con.close()


@app.get("/api/plays")
def list_plays(
    game_id: int = Query(..., description="NFL Game ID e.g. 2021090900"),
    quarter: Optional[int] = Query(None, description="Filter by Quarter (1, 2, 3, 4, 5)")
):
    """List plays for a given game and optional quarter with nflverse metrics."""
    con = get_db()
    try:
        where_clauses = ["gameId = ?"]
        params = [game_id]
        if quarter is not None and quarter > 0:
            where_clauses.append("quarter = ?")
            params.append(quarter)

        where_sql = " AND ".join(where_clauses)
        query = f"""
            SELECT 
                gameId, playId, quarter, down, yardsToGo, possessionTeam, defensiveTeam,
                yardlineSide, yardlineNumber, gameClock, playDescription, playResult, passResult,
                epa, wpa, wp, cpoe, air_yards as airYards, yards_after_catch as yac, success,
                offenseFormation, personnelO, personnelD, defendersInBox,
                pff_passCoverage as coverage, pff_passCoverageType as coverageType
            FROM plays
            WHERE {where_sql}
            ORDER BY playId ASC
        """
        rows = con.execute(query, params).fetchall()
        cols = [col[0] for col in con.description]
        
        plays = []
        for r in rows:
            p = dict(zip(cols, r))
            # Clean floating NaNs
            for k, v in p.items():
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    p[k] = None
            plays.append(p)
        return plays
    finally:
        con.close()


def generate_play_bundle(game_id: int, play_id: int, con: duckdb.DuckDBPyConnection) -> Dict[str, Any]:
    """Generates a complete, rich play bundle for ANY play in ANY game."""
    cache_key = f"{game_id}_{play_id}"
    if cache_key in PLAY_BUNDLE_CACHE:
        return PLAY_BUNDLE_CACHE[cache_key]

    # Check if pre-cached golden play exists
    golden_file = os.path.join(GOLDEN_DIR, f"play_{play_id}.json")
    if os.path.exists(golden_file):
        try:
            with open(golden_file, "r") as f:
                data = json.load(f)
                if data.get("meta", {}).get("gameId") == game_id:
                    PLAY_BUNDLE_CACHE[cache_key] = data
                    return data
        except Exception:
            pass

    # 1. Fetch Play row
    play_query = "SELECT * FROM plays WHERE gameId = ? AND playId = ?"
    play_row = con.execute(play_query, [game_id, play_id]).fetchone()
    if not play_row:
        raise HTTPException(status_code=404, detail=f"Play {play_id} not found in game {game_id}")
    play_cols = [col[0] for col in con.description]
    play_dict = dict(zip(play_cols, play_row))
    for k, v in play_dict.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            play_dict[k] = None

    # Fetch Game row
    game_row = con.execute("SELECT * FROM games WHERE gameId = ?", [game_id]).fetchone()
    game_cols = [col[0] for col in con.description]
    game_dict = dict(zip(game_cols, game_row)) if game_row else {}

    poss_team = play_dict.get("possessionTeam", "")
    def_team = play_dict.get("defensiveTeam", "")

    # 2. Fetch Tracking for (game_id, play_id)
    csv_path = os.path.join(REGIONAL_DIR, "tracking", f"tracking_{game_id}.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"Tracking file for game {game_id} not found")

    trk_query = f"SELECT * FROM read_csv_auto('{csv_path}') WHERE playId = {play_id}"
    trk = con.execute(trk_query).df()
    if len(trk) == 0:
        raise HTTPException(status_code=404, detail=f"No tracking data for game {game_id} play {play_id}")

    # Standardize tracking coordinates
    trk["x"] = pd.to_numeric(trk["x"], errors="coerce").fillna(0)
    trk["y"] = pd.to_numeric(trk["y"], errors="coerce").fillna(0)
    trk["s"] = pd.to_numeric(trk["s"], errors="coerce").fillna(0)
    trk["a"] = pd.to_numeric(trk["a"], errors="coerce").fillna(0)
    trk["o"] = pd.to_numeric(trk["o"], errors="coerce").fillna(0)
    trk["dir"] = pd.to_numeric(trk["dir"], errors="coerce").fillna(0)

    is_left = trk["playDirection"] == "left"
    trk["x_std"] = np.where(is_left, 120.0 - trk["x"], trk["x"])
    trk["y_std"] = np.where(is_left, (160.0 / 3.0) - trk["y"], trk["y"])
    trk["o_std"] = np.where(is_left, (trk["o"] + 180.0) % 360.0, trk["o"])
    trk["dir_std"] = np.where(is_left, (trk["dir"] + 180.0) % 360.0, trk["dir"])
    trk["speed_mph"] = (trk["s"] * 2.04545).round(2)

    # Compute frame-by-frame distances (to ball and nearest opponent)
    frames_list = []
    event_markers = []
    snap_frame_id = None

    for f_id, f_group in trk.groupby("frameId"):
        frame_events = [ev for ev in f_group["event"].dropna().unique() if ev and ev != "None"]
        for ev in frame_events:
            event_markers.append({"frameId": int(f_id), "event": str(ev)})
            if "ball_snap" in ev:
                snap_frame_id = int(f_id)

        # Football coordinates in this frame
        ball_row = f_group[f_group["team"] == "football"]
        ball_x = ball_row["x_std"].values[0] if len(ball_row) > 0 else None
        ball_y = ball_row["y_std"].values[0] if len(ball_row) > 0 else None

        off_df = f_group[f_group["team"] == poss_team]
        def_df = f_group[f_group["team"] == def_team]

        players_in_frame = []
        for _, r in f_group.iterrows():
            is_ball = r["team"] == "football"
            px = float(r["x_std"])
            py = float(r["y_std"])

            # Dist to ball
            dist_ball = None
            if not is_ball and ball_x is not None and ball_y is not None:
                dist_ball = round(float(np.sqrt((px - ball_x)**2 + (py - ball_y)**2)), 2)

            # Dist to nearest opponent
            dist_opp = None
            if not is_ball:
                opp_df = def_df if r["team"] == poss_team else off_df
                if len(opp_df) > 0:
                    dists = np.sqrt((opp_df["x_std"] - px)**2 + (opp_df["y_std"] - py)**2)
                    dist_opp = round(float(dists.min()), 2)

            players_in_frame.append({
                "nflId": None if is_ball else int(r["nflId"]),
                "team": str(r["team"]),
                "jersey": None if is_ball else (int(r["jerseyNumber"]) if pd.notnull(r["jerseyNumber"]) else None),
                "x": round(px, 2),
                "y": round(py, 2),
                "s_mph": round(float(r["speed_mph"]), 2),
                "a": round(float(r["a"]), 2),
                "o": round(float(r["o_std"]), 1),
                "dir": round(float(r["dir_std"]), 1),
                "distBall": dist_ball,
                "distOpp": dist_opp,
                "event": str(r["event"]) if pd.notnull(r["event"]) and r["event"] != "None" else None
            })

        frames_list.append({
            "frameId": int(f_id),
            "events": frame_events,
            "players": players_in_frame
        })

    # Deduplicate event markers
    seen_ev = set()
    dedup_events = []
    for em in event_markers:
        k = (em["frameId"], em["event"])
        if k not in seen_ev:
            seen_ev.add(k)
            dedup_events.append(em)

    # 3. Active Players from player_play joined with players, combine, and stats
    players_query = """
        SELECT 
            pp.nflId, p.displayName, p.officialPosition as position, pp.pff_role as pffRole,
            pp.pff_positionLinedUp as pffPositionLinedUp, pp.pff_sack as pffSack,
            pp.pff_hit as pffHit, pp.pff_hurry as pffHurry, p.headshot as headshotUrl,
            p.height, p.weight, p.college_name as college, p.pfr_id
        FROM player_play pp
        LEFT JOIN players p ON pp.nflId = p.nflId
        WHERE pp.gameId = ? AND pp.playId = ?
    """
    p_rows = con.execute(players_query, [game_id, play_id]).fetchall()
    p_cols = [col[0] for col in con.description]

    active_players = []
    for prow in p_rows:
        pr = dict(zip(p_cols, prow))
        n_id = pr["nflId"]
        pfr_id = pr.get("pfr_id")

        # Player frames in this play
        pframes = trk[trk["nflId"] == n_id]
        play_peak_speed = float(pframes["speed_mph"].max()) if len(pframes) > 0 else 0.0
        play_peak_accel = float(pframes["a"].max()) if len(pframes) > 0 else 0.0
        team_val = str(pframes["team"].iloc[0]) if len(pframes) > 0 else (poss_team if pr.get("pffRole") in ["Pass", "Pass Route", "Pass Block"] else def_team)
        jersey_val = int(pframes["jerseyNumber"].iloc[0]) if len(pframes) > 0 and pd.notnull(pframes["jerseyNumber"].iloc[0]) else None

        # Combine
        comb_row = con.execute("SELECT * FROM pfr_combine WHERE pfr_id = ?", [pfr_id]).fetchone() if pfr_id else None
        c_cols = [c[0] for c in con.description] if comb_row else []
        comb_dict = dict(zip(c_cols, comb_row)) if comb_row else {}

        # Percentiles
        pos = pr.get("position", "")
        percentile_dict = {}
        if pos and pfr_id:
            pct_rows = con.execute("SELECT metric, p10, p50, p90, lower_is_better FROM pfr_combine_percentiles WHERE pos = ?", [pos]).fetchall()
            for metric, p10, p50, p90, lower_better in pct_rows:
                val = comb_dict.get(metric)
                if val is not None and not (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
                    if lower_better:
                        pct = 90 - (val - p10) / (p90 - p10 + 1e-6) * 80
                    else:
                        pct = 10 + (val - p10) / (p90 - p10 + 1e-6) * 80
                    percentile_dict[metric] = round(max(5.0, min(99.0, pct)), 1)
                else:
                    percentile_dict[metric] = None

        # Seasonal
        seasonal_stats = {}
        if pfr_id:
            for tbl, prefix in [("pfr_adv_pass", "pass"), ("pfr_adv_rec", "rec"), ("pfr_adv_rush", "rush"), ("pfr_adv_def", "def")]:
                s_row = con.execute(f"SELECT * FROM {tbl} WHERE pfr_id = ? LIMIT 1", [pfr_id]).fetchone()
                if s_row:
                    s_c = [c[0] for c in con.description]
                    s_dict = dict(zip(s_c, s_row))
                    for sk, sv in s_dict.items():
                        if isinstance(sv, float) and (math.isnan(sv) or math.isinf(sv)):
                            s_dict[sk] = None
                    seasonal_stats[prefix] = s_dict

        active_players.append({
            "nflId": int(n_id),
            "displayName": str(pr.get("displayName") or f"Player {n_id}"),
            "jerseyNumber": jersey_val,
            "team": team_val,
            "position": str(pr.get("position") or "ATH"),
            "pffRole": str(pr.get("pffRole") or "Assignment"),
            "pffPositionLinedUp": str(pr.get("pffPositionLinedUp") or ""),
            "pffSack": bool(pr.get("pffSack") == 1),
            "pffHit": bool(pr.get("pffHit") == 1),
            "pffHurry": bool(pr.get("pffHurry") == 1),
            "headshotUrl": pr.get("headshotUrl"),
            "college": pr.get("college") or "",
            "height": pr.get("height") or "",
            "weight": int(pr["weight"]) if pr.get("weight") and not math.isnan(pr["weight"]) else None,
            "combine": {
                "forty": comb_dict.get("forty"),
                "vertical": comb_dict.get("vertical"),
                "broadJump": comb_dict.get("broad_jump"),
                "cone": comb_dict.get("cone"),
                "shuttle": comb_dict.get("shuttle"),
                "bench": comb_dict.get("bench"),
                "draftRound": comb_dict.get("draft_round"),
                "draftOvr": comb_dict.get("draft_ovr"),
                "percentiles": percentile_dict
            },
            "seasonalStats": {
                "pocket_time": seasonal_stats.get("pass", {}).get("pocket_time"),
                "times_pressured": seasonal_stats.get("pass", {}).get("times_pressured"),
                "times_blitzed": seasonal_stats.get("pass", {}).get("times_blitzed"),
                "rec_yac": seasonal_stats.get("rec", {}).get("yac"),
                "rec_brk_tkl": seasonal_stats.get("rec", {}).get("brk_tkl"),
                "rush_brk_tkl": seasonal_stats.get("rush", {}).get("brk_tkl"),
                "rush_yac": seasonal_stats.get("rush", {}).get("yac"),
                "pressures_def": seasonal_stats.get("def", {}).get("pressures"),
            },
            "playPeakSpeedMph": round(play_peak_speed, 2),
            "playPeakAccel": round(play_peak_accel, 2)
        })

    # Speed scatter benchmark for players in this game
    scatter_pts = []
    for ap in active_players:
        if ap.get("combine", {}).get("forty"):
            scatter_pts.append({
                "nflId": ap["nflId"],
                "displayName": ap["displayName"],
                "position": ap["position"],
                "forty": float(ap["combine"]["forty"]),
                "maxGameSpeedMph": float(ap["playPeakSpeedMph"]),
            })

    # Formation matrix baseline
    form_query = """
        SELECT offenseFormation as formation, pff_passCoverage as coverage, count(*) as playCount,
               avg(epa) as avgEpa, avg(cpoe) as avgCpoe, avg(success) as successRate
        FROM plays
        WHERE offenseFormation IS NOT NULL AND pff_passCoverage IS NOT NULL
        GROUP BY offenseFormation, pff_passCoverage
        ORDER BY playCount DESC
        LIMIT 25
    """
    f_rows = con.execute(form_query).fetchall()
    f_cols = [c[0] for c in con.description]
    formation_matrix_list = []
    for fr in f_rows:
        fd = dict(zip(f_cols, fr))
        formation_matrix_list.append({
            "formation": str(fd["formation"]),
            "coverage": str(fd["coverage"]),
            "playCount": int(fd["playCount"]),
            "avgEpa": round(float(fd["avgEpa"] or 0), 3),
            "avgCpoe": round(float(fd["avgCpoe"] or 0), 2),
            "successRate": round(float(fd["successRate"] or 0) * 100, 1)
        })

    # Pick focus player (e.g. targeted receiver or rusher or highest speed)
    focus_nfl_id = active_players[0]["nflId"] if active_players else None
    for ap in active_players:
        if ap.get("pffRole") in ["Pass Route", "Pass Rush"]:
            focus_nfl_id = ap["nflId"]
            break

    bundle = {
        "meta": {
            "id": f"play_{play_id}",
            "gameId": int(game_id),
            "playId": int(play_id),
            "title": f"Play #{play_id}: {poss_team} vs {def_team}",
            "badge": f"Q{play_dict.get('quarter')} {play_dict.get('down')}&{play_dict.get('yardsToGo')}",
            "subtitle": play_dict.get("playDescription", ""),
            "focusNflId": focus_nfl_id,
            "focusPlayerName": active_players[0]["displayName"] if active_players else "",
            "focusJersey": active_players[0]["jerseyNumber"] if active_players else 0,
            "keyFrame": snap_frame_id or 1,
            "description": play_dict.get("playDescription", "")
        },
        "context": {
            "gameId": int(game_id),
            "playId": int(play_id),
            "season": int(game_dict.get("season", 2021)),
            "week": int(game_dict.get("week", 1)),
            "homeTeam": str(game_dict.get("homeTeamAbbr", def_team)),
            "visitorTeam": str(game_dict.get("visitorTeamAbbr", poss_team)),
            "possessionTeam": str(poss_team),
            "defensiveTeam": str(def_team),
            "down": int(play_dict.get("down") or 1),
            "yardsToGo": int(play_dict.get("yardsToGo") or 10),
            "yardlineNumber": int(play_dict.get("yardlineNumber") or 50),
            "yardlineSide": str(play_dict.get("yardlineSide") or poss_team),
            "quarter": int(play_dict.get("quarter") or 1),
            "gameClock": str(play_dict.get("gameClock") or "15:00"),
            "preSnapHomeScore": int(play_dict.get("preSnapHomeScore") or 0),
            "preSnapVisitorScore": int(play_dict.get("preSnapVisitorScore") or 0),
            "playDescription": str(play_dict.get("playDescription") or ""),
            "playResult": int(play_dict.get("playResult") or 0),
            "epa": round(float(play_dict["epa"]), 3) if play_dict.get("epa") is not None else None,
            "wpa": round(float(play_dict["wpa"]), 4) if play_dict.get("wpa") is not None else None,
            "wp": round(float(play_dict["wp"]), 3) if play_dict.get("wp") is not None else None,
            "cpoe": round(float(play_dict["cpoe"]), 2) if play_dict.get("cpoe") is not None else None,
            "airYards": float(play_dict["air_yards"]) if play_dict.get("air_yards") is not None else None,
            "yac": float(play_dict["yards_after_catch"]) if play_dict.get("yards_after_catch") is not None else None,
            "success": bool(play_dict.get("success") == 1),
            "passResult": str(play_dict.get("passResult") or ""),
            "passer": str(play_dict.get("passer") or ""),
            "receiver": str(play_dict.get("receiver") or ""),
            "offenseFormation": str(play_dict.get("offenseFormation") or "SHOTGUN"),
            "personnelO": str(play_dict.get("personnelO") or "1 RB, 1 TE, 3 WR"),
            "personnelD": str(play_dict.get("personnelD") or "4 DL, 2 LB, 5 DB"),
            "defendersInBox": int(play_dict["defendersInBox"]) if play_dict.get("defendersInBox") is not None else None,
            "coverage": str(play_dict.get("pff_passCoverage") or "Cover-1"),
            "coverageType": str(play_dict.get("pff_passCoverageType") or "Man"),
            "dropBackType": str(play_dict.get("dropBackType") or "TRADITIONAL"),
            "snapFrameId": snap_frame_id or 1
        },
        "events": dedup_events,
        "players": active_players,
        "frames": frames_list,
        "speedScatterBenchmark": scatter_pts,
        "formationMatrix": formation_matrix_list
    }

    PLAY_BUNDLE_CACHE[cache_key] = bundle
    return bundle


@app.get("/api/play/{game_id}/{play_id}")
def get_play_bundle_endpoint(game_id: int, play_id: int):
    """Get complete rich bundle for ANY play in ANY game with 10Hz frames and telemetry."""
    con = get_db()
    try:
        return generate_play_bundle(game_id, play_id, con)
    finally:
        con.close()


@app.get("/api/player/{nfl_id}")
def get_player_profile(nfl_id: int):
    """Get joined player profile (Tracking + nflverse + PFR combine & seasonal)."""
    con = get_db()
    try:
        player_row = con.execute("SELECT * FROM players WHERE nflId = ?", [nfl_id]).fetchone()
        if not player_row:
            raise HTTPException(status_code=404, detail="Player not found.")
        p_cols = [col[0] for col in con.description]
        p_data = dict(zip(p_cols, player_row))
        pfr_id = p_data.get("pfr_id")

        # Combine measurables
        combine_data = {}
        percentiles = {}
        if pfr_id:
            comb_row = con.execute("SELECT * FROM pfr_combine WHERE pfr_id = ?", [pfr_id]).fetchone()
            if comb_row:
                c_cols = [col[0] for col in con.description]
                combine_data = dict(zip(c_cols, comb_row))
            
            # Position percentiles
            pos = p_data.get("officialPosition")
            if pos:
                pct_rows = con.execute("SELECT metric, p10, p50, p90, lower_is_better FROM pfr_combine_percentiles WHERE pos = ?", [pos]).fetchall()
                for metric, p10, p50, p90, lower_better in pct_rows:
                    val = combine_data.get(metric)
                    if val is not None and not (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
                        if lower_better:
                            pct = 90 - (val - p10) / (p90 - p10 + 1e-6) * 80
                        else:
                            pct = 10 + (val - p10) / (p90 - p10 + 1e-6) * 80
                        percentiles[metric] = round(max(5.0, min(99.0, pct)), 1)

        # Seasonal stats
        seasonal_stats = {}
        if pfr_id:
            for tbl, prefix in [("pfr_adv_pass", "pass"), ("pfr_adv_rec", "rec"), ("pfr_adv_rush", "rush"), ("pfr_adv_def", "def")]:
                s_row = con.execute(f"SELECT * FROM {tbl} WHERE pfr_id = ? LIMIT 1", [pfr_id]).fetchone()
                if s_row:
                    s_cols = [col[0] for col in con.description]
                    seasonal_stats[prefix] = dict(zip(s_cols, s_row))

        return {
            "player": p_data,
            "combine": combine_data,
            "percentiles": percentiles,
            "seasonalStats": seasonal_stats
        }
    finally:
        con.close()


# Mount frontend dist static files if built
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
        return FileResponse(index_file)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
