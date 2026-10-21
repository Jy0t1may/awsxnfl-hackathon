# 🏈 GridironLens — NFL Visual Analytics Platform (v2.0)

> **Interactive Multi-Persona NFL Tracking & Cross-Source Visual Analytics**  
> Grounded in 100% authentic, standard football metrics across **Next Gen Stats (10Hz Tracking)**, **nflverse (PBP & ID Bridge)**, and **Pro Football Reference (Combine & Seasonal Advanced Stats)**.

Watch the preview : 'Preview Video.mp4' in the source repository

---

## 🏆 Key Architectural Updates (v2.0)
- **Focused 2-Persona Experience**: Streamlined exclusively for **Coach View** (Schemes, Formations, Defensive Shells, EPA Matrix) and **Recruiter View** (PFR Combine Drills, Positional Percentiles, In-Game Speed vs 40-Time).
- **Full Match & Quarter Explorer**: Select any of the 122 matches across Weeks 1 to 8, filter by Quarter (Q1, Q2, Q3, Q4), and scrub through all 70–100 plays with dynamic 10Hz tracking and telemetrics.
- **Customizable Telemetry Plotting**: Checkboxes on the timeline allow toggling curves on demand (`Speed (MPH)`, `Acceleration (yd/s²)`, `Defender Separation (yds)`, `Distance to Ball (yds)`).
- **Enhanced Player Clickability**: Generous 24px canvas hit-testing with closest-player resolution PLUS an Interactive On-Field Roster Strip directly beneath the turf.
- **Full 22-Player Roster Telemetrics**: Toggle between Offense and Defense in Recruiter View with clear Combine drill status (tested vs UFA/Pro Day) and seasonal stats.

---

## 🚀 Quickstart: One-Click Startup

```bash
chmod +x run_project.sh
./run_project.sh
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173) (or [http://127.0.0.1:8000](http://127.0.0.1:8000))
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🌟 Visual Workspaces

### 1. 🏈 Coach View (Scheme, Alignment & EPA Context)
- **Drive & Game Context Strip**: Down & Distance, Field Position, Clock, Personnel groupings (`11`, `12`), Coverage Shell (`Cover-1`, `Cover-3`, `Quarters`, `Man/Zone`), and Play EPA outcome.
- **Formation & Coverage EPA Benchmark Matrix**: Benchmarks the offense's active formation against every defensive coverage shell across all 8,557 plays in the dataset.
- **Active Assignment Breakdown Table**: Roster of all 22 active players on the field with their exact `player_play.csv` responsibilities (route, block, pass rush, coverage, sack/hit/hurry credits).

### 2. 📋 Recruiter / Scout View (PFR Combine vs. Live 10Hz Game Speed)
- **Dual-Team Roster Navigator**: Toggle between Offense and Defense to inspect any of the 22 active players on the play.
- **Combine Positional Percentile Profile**: Horizontal percentile bars for `40-Yard Dash`, `Vertical Jump`, `Broad Jump`, `3-Cone Drill`, `20-Yd Shuttle`, and `Bench Press` benchmarked against all historical prospects at that position.
- **Combine Speed vs. In-Game Tracked Speed Scatterplot**: Scatterplot plotting PFR Combine `forty` time on the X-axis vs. actual 10Hz tracked `Max In-Game Speed (MPH)` on the Y-axis across all players in the dataset.
- **PFR Seasonal Production Card**: PFR seasonal metrics (`Yards After Contact`, `Broken Tackles`, `Pocket Time`, `Times Blitzed`, `Pressures Generated`) alongside peak tracked in-game speed and acceleration.
