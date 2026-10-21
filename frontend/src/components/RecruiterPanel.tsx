import React, { useState, useMemo } from 'react';
import { 
  PlayBundle, 
  ActivePlayer, 
  SpeedScatterPoint 
} from '../types';
import { DataSourceBadge } from './DataSourceBadge';
import { 
  Users, 
  Award, 
  Zap, 
  Dna, 
  Target, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface RecruiterPanelProps {
  bundle: PlayBundle;
  selectedPlayerId: number | null;
  onSelectPlayer: (nflId: number | null) => void;
  showSourceBadges: boolean;
}

export const RecruiterPanel: React.FC<RecruiterPanelProps> = ({
  bundle,
  selectedPlayerId,
  onSelectPlayer,
  showSourceBadges,
}) => {
  const { players, speedScatterBenchmark, meta, context } = bundle;
  const targetNflId = selectedPlayerId || meta.focusNflId;

  // Selected player object
  const activePlayer = players.find((p) => p.nflId === targetNflId) || players[0];
  const combine = activePlayer?.combine || ({} as any);
  const percentiles = combine.percentiles || {};
  const seasonal = activePlayer?.seasonalStats || {};

  // Team Filter for the Roster selector
  const [selectedTeamTab, setSelectedTeamTab] = useState<'possession' | 'defense'>('possession');

  const possessionRoster = useMemo(() => {
    return players.filter((p) => p.team === context.possessionTeam);
  }, [players, context.possessionTeam]);

  const defenseRoster = useMemo(() => {
    return players.filter((p) => p.team !== context.possessionTeam);
  }, [players, context.possessionTeam]);

  const currentRoster = selectedTeamTab === 'possession' ? possessionRoster : defenseRoster;

  // Combine drills definitions
  const combineDrills = [
    { key: 'forty', label: '40-Yard Dash', rawVal: combine.forty ? `${combine.forty}s` : null, pct: percentiles.forty },
    { key: 'vertical', label: 'Vertical Jump', rawVal: combine.vertical ? `${combine.vertical}"` : null, pct: percentiles.vertical },
    { key: 'broad_jump', label: 'Broad Jump', rawVal: combine.broadJump ? `${combine.broadJump}"` : null, pct: percentiles.broad_jump },
    { key: 'cone', label: '3-Cone Drill', rawVal: combine.cone ? `${combine.cone}s` : null, pct: percentiles.cone },
    { key: 'shuttle', label: '20-Yd Shuttle', rawVal: combine.shuttle ? `${combine.shuttle}s` : null, pct: percentiles.shuttle },
    { key: 'bench', label: 'Bench Press', rawVal: combine.bench ? `${combine.bench} reps` : null, pct: percentiles.bench },
  ];

  const hasCombineData = combineDrills.some((d) => d.rawVal !== null);

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Selected Player Scouting Bio Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-xs tracking-wider uppercase">
              Pro Football Reference Scouting Profile
            </h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <DataSourceBadge source="PFR" visible={showSourceBadges} />
            <DataSourceBadge source="nflverse" visible={showSourceBadges} />
          </div>
        </div>

        {/* Player Header with Headshot */}
        <div className="flex items-start space-x-3.5">
          {activePlayer?.headshotUrl ? (
            <img
              src={activePlayer.headshotUrl}
              alt={activePlayer.displayName}
              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-700 bg-slate-950 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-lg text-slate-400">
              #{activePlayer?.jerseyNumber || '—'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-white truncate font-mono">
                {activePlayer?.displayName}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                #{activePlayer?.jerseyNumber ?? '—'} • {activePlayer?.position}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Team: <strong className="text-white">{activePlayer?.team}</strong> • College: {activePlayer?.college || 'N/A'} • {activePlayer?.height} / {activePlayer?.weight} lbs
            </p>

            {/* Draft Info */}
            <div className="text-[11px] text-slate-300 font-mono mt-1 flex items-center space-x-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Draft: {combine.draftRound ? `Round ${combine.draftRound}, Pick ${combine.draftOvr || '—'}` : 'Undrafted / Free Agent'}
              </span>
            </div>
          </div>
        </div>

        {/* Full Team Roster Selector (Issue #3) */}
        <div className="mt-3.5 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">
              Select Roster to Inspect:
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setSelectedTeamTab('possession')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  selectedTeamTab === 'possession'
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {context.possessionTeam} Offense ({possessionRoster.length})
              </button>
              <button
                onClick={() => setSelectedTeamTab('defense')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  selectedTeamTab === 'defense'
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {context.defensiveTeam} Defense ({defenseRoster.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
            {currentRoster.map((p) => {
              const isSelected = p.nflId === targetNflId;
              return (
                <button
                  key={p.nflId}
                  onClick={() => onSelectPlayer(p.nflId)}
                  className={`px-2 py-1.5 rounded text-left font-mono text-xs border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="truncate">#{p.jerseyNumber ?? '—'} {p.displayName.split(' ').pop()}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black' : 'text-slate-400'}`}>
                    {p.position}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PFR Combine Percentile Profile */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Dna className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-xs tracking-wider uppercase">
                NFL Combine Measurables & Positional Percentiles
              </h3>
              <p className="text-[11px] text-slate-400">
                Benchmarked against {activePlayer?.position} prospects in PFR database
              </p>
            </div>
          </div>
          <DataSourceBadge source="PFR" visible={showSourceBadges} />
        </div>

        {hasCombineData ? (
          <div className="space-y-2.5">
            {combineDrills.map((drill) => {
              const hasVal = drill.rawVal !== null;
              const pctVal = drill.pct !== null && drill.pct !== undefined ? Math.min(100, Math.max(0, drill.pct)) : 0;
              const barColor =
                pctVal >= 75 ? 'bg-emerald-500' :
                pctVal >= 45 ? 'bg-amber-500' :
                'bg-rose-500';

              return (
                <div key={drill.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300 font-medium">{drill.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold">{drill.rawVal || 'Not Recorded'}</span>
                      {hasVal && drill.pct !== null && (
                        <span className={`text-[10px] font-bold ${
                          pctVal >= 75 ? 'text-emerald-400' : pctVal >= 45 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {pctVal.toFixed(0)}th %tile
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    {hasVal ? (
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${pctVal}%` }}
                      />
                    ) : (
                      <div className="h-full bg-slate-800 w-full opacity-30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 text-center space-y-2">
            <Info className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="text-xs font-mono text-slate-300">
              Pro Day / Undrafted Prospect
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {activePlayer?.displayName} did not participate in official NFL Scouting Combine timing drills.
            </p>
          </div>
        )}
      </div>

      {/* 3. Combine 40 vs Live Tracked Speed Scatter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-xs tracking-wider uppercase">
                Combine 40-Time vs. In-Game Tracked Speed
              </h3>
              <p className="text-[11px] text-slate-400">
                PFR testing speed vs. actual NGS 10Hz in-game peak speed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <DataSourceBadge source="PFR" visible={showSourceBadges} />
          </div>
        </div>

        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="forty"
                name="Combine 40-Time"
                unit="s"
                domain={['dataMin - 0.05', 'dataMax + 0.05']}
                reversed
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              />
              <YAxis
                type="number"
                dataKey="maxGameSpeedMph"
                name="Max In-Game Speed"
                unit=" MPH"
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SpeedScatterPoint;
                    const isSelected = data.nflId === targetNflId;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs font-mono shadow-xl">
                        <div className="font-bold text-white mb-0.5">
                          {data.displayName} ({data.position})
                        </div>
                        <div className="text-amber-400">Combine 40: {data.forty}s</div>
                        <div className="text-emerald-400">In-Game Peak: {data.maxGameSpeedMph} MPH</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Players"
                data={speedScatterBenchmark}
                onClick={(node) => {
                  if (node && node.nflId) onSelectPlayer(node.nflId);
                }}
              >
                {speedScatterBenchmark.map((entry, index) => {
                  const isSelected = entry.nflId === targetNflId;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isSelected ? '#f59e0b' : '#0284c7'}
                      stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isSelected ? 3 : 1}
                      r={isSelected ? 7 : 4}
                      className="cursor-pointer"
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 mt-1">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
            <span>Selected Player</span>
          </span>
          <span className="text-slate-500">Click dot to load player</span>
        </div>
      </div>

      {/* 4. PFR Seasonal Production Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-xs tracking-wider uppercase">
              PFR 2021 Advanced Seasonal Telemetrics
            </h3>
          </div>
          <DataSourceBadge source="PFR" visible={showSourceBadges} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Live Play Peak</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {activePlayer?.playPeakSpeedMph || 0} MPH
            </div>
            <div className="text-[10px] text-slate-500">
              Accel: {activePlayer?.playPeakAccel || 0} yd/s²
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">YAC / Contact</div>
            <div className="text-base font-bold text-sky-400 mt-0.5">
              {seasonal.rec_yac ?? seasonal.rush_yac ?? '—'}
            </div>
            <div className="text-[10px] text-slate-500">
              Broken Tkl: {seasonal.rec_brk_tkl ?? seasonal.rush_brk_tkl ?? '0'}
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Pocket Time / Blitz</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {seasonal.pocket_time ? `${seasonal.pocket_time}s` : '—'}
            </div>
            <div className="text-[10px] text-slate-500">
              Blitzes: {seasonal.times_blitzed ?? '—'}
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Pressure Activity</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">
              {seasonal.times_pressured ?? seasonal.pressures_def ?? (activePlayer?.pffSack ? '1 Sack' : '—')}
            </div>
            <div className="text-[10px] text-slate-500">
              Hits: {activePlayer?.pffHit ? '1' : '0'} • Hurries: {activePlayer?.pffHurry ? '1' : '0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
