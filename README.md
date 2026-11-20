# GridIronLens — NFL Visual Analytics Platform (v2.0)

> **Interactive Multi-Persona NFL Tracking & Cross-Source Visual Analytics**  
> Grounded in 100% authentic, standard football metrics across **Next Gen Stats (10Hz Tracking)**, **nflverse (PBP & ID Bridge)**, and **Pro Football Reference (Combine & Seasonal Advanced Stats)** — fortified with an **AWS Zero-Trust Cybersecurity & Cryptographic Telemetry Governance Architecture (NIST SP 800-207)**.

[Watch the preview video](./Preview%20Video.mp4)  
View the live deployment at [awsxnfl-hackathon.vercel.app](https://awsxnfl-hackathon.vercel.app/).  
Deployment done through **Vercel** using our GitHub repository as the source.

---

> [!IMPORTANT]
> ### Live Demo Scope: Week 1 Showcase Game
> **Featured Match:** Dallas Cowboys @ Tampa Bay Buccaneers (`Game ID: 2021090900`)
> 
> To deliver an instantaneous, zero-latency tracking experience within **Vercel's 250 MB serverless deployment limits**, the live web app pre-bundles **the complete 97-play Kickoff game** across **all 4 quarters**.
> 
> #### ⭐ What is Live on Vercel:
> * **Complete 10Hz Telemetry:** All 97 plays rendered with player orientation cones, velocity vectors, ball coordinates, and live separation tethers.
> * **Unified Metrics:** Synchronized `nflverse` EPA/Win Probability swings, PFF coverage and route assignments, and Pro Football Reference Combine profiles for all 22 players.
> * **AWS Cyber Defense Hub:** Interactive live inspection of AWS KMS envelope encryption tokens, CloudTrail audit streams, and real-time cyber threat simulations (SQLi, Exfiltration, Rate-Limiting).
> 
> ##### To Access the Full 122-Game Dataset:
> The entire 8-week dataset (>1 GB of raw telemetry) is designed to run via the included DuckDB and FastAPI backend. To run all 122 games locally without serverless storage constraints, refer to the [One-Click Startup](#instructions-to-use-one-click-startup-local) guide below.

---

## Feature List & Core Functionality

- **Focused 2-Persona Experience**:
  - *Functionality*: Eliminates visual clutter by dedicating independent analytical workspaces to either high-level tactical scheme design (**Coach View**) or individual prospect evaluation and physical measurables (**Recruiter View**).
- **Interactive 2D Field Canvas with Dual-Angle Vectors**:
  - *Functionality*: Renders all 22 players and the football at 10Hz with directional velocity vectors (`dir`, arrow length scaled to MPH) and transparent orientation viewing cones (`o`, showing helmet/shoulder facing). Includes pre-snap motion trails, post-snap routes, live yardage separation tethers, and role annotations.
- **Enhanced Player Clickability & Canvas Hit-Testing**:
  - *Functionality*: Generous 24px canvas hit-box with closest-player resolution directly on the turf, paired with an **Interactive On-Field Roster Strip** positioned directly below the canvas for 1-click selection of any jersey number.
- **Full Match & Quarter Scroller**:
  - *Functionality*: Allows users to browse all 122 matches across Weeks 1 to 8, filter plays by quarter (`Q1`, `Q2`, `Q3`, `Q4`), and scrub through all offensive snaps in sequence with live situation indicators (down/distance, game clock, yardline, and EPA tags).
- **Customizable Multi-Track Telemetry Plotting**:
  - *Functionality*: A video-editor style timeline synchronized to the field animation with clickable NFL event pins (`ball_snap`, `pass_forward`, `pass_arrived`, `tackle`). Modular checkboxes allow coaches and scouts to plot only the metrics they need on demand (`Speed (MPH)`, `Acceleration (yd/s²)`, `Defender Separation (yds)`, `Distance to Ball (yds)`).
- **Full 22-Player Roster Scouting**:
  - *Functionality*: Seamlessly toggle between Offense and Defense in Recruiter View to inspect Combine drill percentiles, distinguish Combine-tested athletes from UFA / Pro Day prospects, and compare seasonal production against in-game peak speeds.
- **AWS Cyber Defense & Zero-Trust Governance Hub**:
  - *Functionality*: An interactive header drawer (**`[AWS Security: ZERO-TRUST]`**) providing live cryptographic inspection of athlete telemetry tokens under **AWS KMS Customer Managed Keys (CMK)**, a structured **CloudTrail audit event stream**, and an **interactive threat simulator** demonstrating real-time **AWS WAF v2** and **IAM ABAC** mitigations against SQLi and unauthorized exfiltration.
- **Data Source Origin Indicators**:
  - *Functionality*: An optional top-bar toggle overlays color-coded provenance badges (`[NGS Tracking]`, `[nflverse]`, `[PFR]`) on every metric across the platform, giving judges full transparency into how datasets are joined.

---

## Visual Workspaces

### 1. Coach View (Scheme, Alignment & EPA Context)
- **Drive & Game Context Strip**: Instant visibility into Down & Distance, Field Position, Clock, Personnel Groupings (`11`, `12`, `21`), Defensive Coverage Shells (`Cover-1`, `Cover-3`, `Quarters`, `Man/Zone`), and Play EPA outcome.
- **Formation & Coverage EPA Benchmark Matrix**: Dynamically benchmarks the offense's active formation and motion concept against every defensive coverage shell across all 8,557 plays in the dataset, identifying schematic advantages.
- **Active Assignment Breakdown Table**: Roster of all 22 active players on the field with their exact `player_play.csv` responsibilities (route ran, pass block, pass rush role, coverage assignment, and sack/hit/hurry credits).

### 2. Recruiter / Scout View (PFR Combine vs. Live 10Hz Game Speed)
- **Dual-Team Roster Navigator**: Toggle between offensive and defensive units to select and inspect any athlete on the field.
- **Combine Positional Percentile Profile**: Horizontal percentile bars for `40-Yard Dash`, `Vertical Jump`, `Broad Jump`, `3-Cone Drill`, `20-Yd Shuttle`, and `Bench Press` benchmarked against historical prospect distributions for that exact position.
- **Combine Speed vs. In-Game Tracked Speed Scatterplot**: Interactive scatterplot plotting PFR Combine `forty` time on the X-axis against actual 10Hz tracked `Max In-Game Speed (MPH)` on the Y-axis across all players in the dataset, highlighting the active athlete.
- **PFR Seasonal Production Card**: Authentic PFR seasonal advanced stats (`Yards After Contact`, `Broken Tackles`, `Pocket Time`, `Times Blitzed`, `Pressures Generated`, `Approximate Value`) displayed alongside peak in-game speed and acceleration.

---

## AWS Zero-Trust Cybersecurity Architecture (NIST SP 800-207)

In professional sports analytics, high-frequency player tracking telemetry and front-office scouting evaluations represent sensitive athlete biometric data and proprietary competitive intel. Unprotected telemetry is vulnerable to medical tampering, competitive espionage, and unauthorized draft leaks.

GridironLens implements an **AWS Zero-Trust Telemetry Defense Architecture** declared with Terraform in [`infrastructure/aws/`](./infrastructure/aws/):

```text
[ 10Hz Stadium RFID Sensors / Client ]
                  │
                  ▼
         [ AWS WAF v2 ]  <─── Rate Limiting (500 req/5m), SQLi & Bot Protection
                  │
                  ▼
       [ Amazon API Gateway / FastAPI ]
                  │
        ┌─────────┴─────────────────────────┐
        ▼                                   ▼
 [ IAM Zero-Trust / ABAC Guard ]     [ CloudTrail Audit Stream ]
 (Coach vs. Scout vs. Ingest Roles)  (Real-Time Tamper-Proof Access Logs)
        │
        ▼
 [ AWS KMS (Envelope Encryption) ]   <─── Customer Managed Key (CMK) with AES-256-GCM
        │
        ▼
 [ Amazon S3 Telemetry Data Lake ]   <─── Enforced TLS 1.3, Object Lock & Public Access Block
```

### Key Security Implementations:
1. **AWS KMS Envelope Encryption (`infrastructure/aws/kms.tf`)**:
   - Customer Managed Key (CMK) with annual automated key rotation (`enable_key_rotation = true`).
   - Uses 256-bit Data Encryption Keys (DEKs) and authenticated `AES-256-GCM` to encrypt sensitive athlete biometric telemetry before leaving the data lake.
2. **Amazon S3 Data Lake Protection (`infrastructure/aws/s3_telemetry.tf`)**:
   - Default SSE-KMS encryption with S3 Bucket Keys enabled.
   - Enforced in-transit TLS 1.3 (`aws:SecureTransport = false` deny policy).
   - S3 Public Access Block enabled across all four vectors with object versioning for forensic immutability.
3. **Attribute-Based Access Control (ABAC) Separation of Duties (`infrastructure/aws/iam_abac.tf`)**:
   - **`CoachRole`**: Permitted to inspect tactical schemes, formations, and 10Hz coordinates; **explicit Deny** on draft scouting notes and athlete contract/medical flags.
   - **`ScoutRole`**: Permitted to inspect Combine percentiles and peak sprint speeds; **explicit Deny** on proprietary playbook tactic sheets.
4. **AWS WAF v2 Perimeter Defense (`infrastructure/aws/waf.tf`)**:
   - Mitigates automated scraping of 10Hz tracking frames via a 500 req / 5 min rate limiter.
   - Blocks SQL/DuckDB injection attempts at the cloud edge via `AWSManagedRulesSQLiRuleSet`.
5. **AWS CloudTrail & CloudWatch Anomaly Detection (`infrastructure/aws/cloudtrail.tf`)**:
   - Comprehensive audit logging of all `kms:Decrypt` and S3 object data access events.
   - CloudWatch Metric Alarm detecting anomalous bulk downloads of prospect draft cards.

> 📄 **Full Technical Security Report**: Read the complete STRIDE threat analysis, key policies, and test evidence in [`report.md`](./report.md) or [`docs/AWS_CYBERSECURITY_REPORT.md`](./docs/AWS_CYBERSECURITY_REPORT.md).

---

## Data Architecture & Integration Pipeline

GridironLens is built strictly on **authentic, standard football metrics** with **zero synthetic composite scores**. All values originate from three joined authoritative sources:

```text
[NFL Big Data Bowl Regional Data]      [nflverse Play-by-Play]           [Pro Football Reference]
    (10Hz Tracking Coordinates)             (EPA, WPA, CPOE)             (Combine & Seasonal Stats)
                │                                  │                                  │
          (gameId, playId)                  (old_game_id, play_id)               (pfr_id / gsis_id)
                │                                  │                                  │
                └─────────────────────────┬────────┴──────────────────────────────────┘
                                          ▼
                         [DuckDB Cross-Source Relational Model]
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
            [FastAPI Backend Engine]              [Pre-Baked Edge Bundles]
            (Full 122-Game Dataset)               (Marquee Match on Vercel)
```

1. **NFL Big Data Bowl Regional Event Data (Next Gen Stats 10Hz Tracking)**:
   - Provides frame-by-frame player coordinates (`x`, `y` standardized so the offense drives left-to-right), speed `s` converted to `speed_mph = s * 2.04545`, acceleration `a` in yds/s², orientation `o`, direction of motion `dir`, and pairwise Euclidean player-to-player separation distances.
2. **nflverse Data (Play-by-Play & ID Bridge)**:
   - Provides down/distance, clock, formation, personnel groupings, and authentic advanced metrics: Expected Points Added (`epa`), Win Probability (`wp`), Win Probability Added (`wpa`), and Completion % Over Expected (`cpoe`).
   - Acts as the universal identifier bridge linking `gameId == old_game_id`, `playId == play_id`, and `nflId <-> gsis_id <-> pfr_id`.
3. **Pro Football Reference (PFR) & PFF Scouting**:
   - Provides NFL Combine physical measurables (`forty`, `vertical`, `broad_jump`, `cone`, `shuttle`, `bench`), draft capital, and seasonal advanced stats (`broken_tackles`, `yards_after_contact`, `pressures`, `blitzes`, `pocket_time`, `av`).

---

## How Vercel Serves the Application Without the 1 GB Dataset

The uncompressed tracking dataset contains 122 game files totaling ~1 GB. Git repositories and serverless edge hosts (like Vercel) enforce strict 50 MB file limits and ephemeral execution limits that prevent hosting 1 GB of raw CSVs directly inside a serverless function.

GridironLens solves this through a **Hybrid Dual-Engine Architecture**:

1. **Standalone Vercel Edge Mode (Default Live Deployment)**:
   - The ETL pipeline pre-compiles complete, 10Hz tracking sequences for **all 97 plays across all 4 quarters** of the marquee Kickoff game (**Dallas Cowboys @ Tampa Bay Buccaneers — Game ID: `2021090900`**) into lightweight (~18 MB total) static JSON bundles under `frontend/public/data/`.
   - Security posture and CloudTrail audit streams are pre-rendered into static fallback assets so judges can evaluate the AWS Cyber Defense Hub with zero latency.
   - When deployed on Vercel, the client loads these bundles directly from Vercel's global CDN with **0ms server latency**, **zero backend dependencies**, and **zero cloud hosting costs**.
2. **Dynamic Cloud Backend Mode (Extensible via `VITE_API_BASE_URL`)**:
   - For environments where users want to dynamically query all 122 games and 8,500+ plays, the provided [`Dockerfile`](./Dockerfile) packages the FastAPI + DuckDB backend with the full 1 GB dataset.
   - Pointing the Vercel environment variable `VITE_API_BASE_URL` to the hosted backend container (Render, Railway, or AWS App Runner) enables full dynamic querying across the entire 8-week season with seamless static fallback.

---

## Instructions to Use: One-Click Startup (Local)

To run the complete platform locally with the full dynamic FastAPI backend, DuckDB engine, and Vite React frontend:

```bash
chmod +x run_project.sh
./run_project.sh
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173) (or [http://127.0.0.1:8000](http://127.0.0.1:8000))
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **AWS Security Endpoints**: [http://127.0.0.1:8000/api/security/posture](http://127.0.0.1:8000/api/security/posture)

---

## References & Data Sources
- **NFL Big Data Bowl Regional Event Data**: [ThompsonJamesBliss/nfl-big-data-bowl-regional-event-data](https://github.com/ThompsonJamesBliss/nfl-big-data-bowl-regional-event-data)
- **nflverse Play-by-Play & Player ID Mapping**: [nflverse Data Releases](https://github.com/nflverse/nflverse-data)
- **Pro Football Reference**: NFL Combine historical database and PFR Advanced Seasonal Statistics.
- **National Institute of Standards and Technology (NIST)**: [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final)
