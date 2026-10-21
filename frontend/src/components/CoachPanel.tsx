import React from 'react';
import { 
  PlayBundle 
} from '../types';
import { DataSourceBadge } from './DataSourceBadge';
import { 
  Compass, 
  TrendingUp, 
  Table, 
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

interface CoachPanelProps {
  bundle: PlayBundle;
  selectedPlayerId: number | null;
  onSelectPlayer: (nflId: number | null) => void;
  showSourceBadges: boolean;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  bundle,
  selectedPlayerId,
  onSelectPlayer,
  showSourceBadges,
}) => {
  const { context, players, formationMatrix } = bundle;

  // Filter formation matrix to the current play's formation
  const currentFormationData = formationMatrix.filter(
    (f) => f.formation.toUpperCase() === context.offenseFormation?.toUpperCase()
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Drive & Game Context Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-xs tracking-wider uppercase">
              Offensive Scheme & Play Outcome Context
            </h3>
          </div>
          <DataSourceBadge source="nflverse" visible={showSourceBadges} />
        </div>

        {/* Scheme Matrix Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Situation */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400">Situation</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {context.down}&{context.yardsToGo}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              @ {context.yardlineSide} {context.yardlineNumber} (Q{context.quarter})
            </div>
          </div>

          {/* Offense Formation & Personnel */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400">Formation & Personnel</div>
            <div className="text-base font-bold text-sky-400 font-mono mt-0.5">
              {context.offenseFormation || 'SHOTGUN'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {context.personnelO || '1 RB, 1 TE, 3 WR'}
            </div>
          </div>

          {/* Defensive Coverage Shell */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400">Defensive Shell</div>
            <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
              {context.coverage || 'Cover-1'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {context.coverageType || 'Man'} • {context.personnelD || 'Nickel (5 DB)'}
            </div>
          </div>

          {/* EPA & Outcome */}
          <div className={`p-2.5 rounded-lg border ${
            (context.epa || 0) >= 0 
              ? 'bg-emerald-950/40 border-emerald-500/40' 
              : 'bg-rose-950/40 border-rose-500/40'
          }`}>
            <div className="text-[10px] uppercase font-mono text-slate-400">Expected Points (EPA)</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${
              (context.epa || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {context.epa !== null ? `${context.epa > 0 ? '+' : ''}${context.epa.toFixed(2)} EPA` : '—'}
            </div>
            <div className="text-[10px] font-mono text-slate-300 flex items-center space-x-1">
              <span>CPOE: {context.cpoe ? `${context.cpoe > 0 ? '+' : ''}${context.cpoe.toFixed(1)}%` : '—'}</span>
              <span>•</span>
              <span className={context.success ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {context.success ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>
          </div>
        </div>

        {/* Play Description Callout */}
        <div className="mt-3 p-2 bg-slate-950/80 rounded-md border border-slate-800 text-xs text-slate-300 font-mono italic">
          "{context.playDescription}"
        </div>
      </div>

      {/* 2. Formation & Coverage EPA Benchmark Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-xs tracking-wider uppercase">
                Formation EPA vs. Defensive Coverages
              </h3>
              <p className="text-[11px] text-slate-400">
                Scheme baseline for <strong className="text-sky-300">{context.offenseFormation}</strong> across 8,557 plays in dataset
              </p>
            </div>
          </div>
          <DataSourceBadge source="nflverse" visible={showSourceBadges} />
        </div>

        {/* Formation EPA Bar Chart */}
        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentFormationData.length > 0 ? currentFormationData : formationMatrix.slice(0, 7)}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="coverage"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                interval={0}
                angle={-15}
                textAnchor="end"
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isPlayCoverage = data.coverage.toLowerCase() === context.coverage?.toLowerCase();
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs font-mono shadow-xl">
                        <div className="font-bold text-white mb-1 flex items-center space-x-1.5">
                          <span>{data.formation} vs {data.coverage}</span>
                          {isPlayCoverage && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-black font-bold">CURRENT PLAY</span>
                          )}
                        </div>
                        <div className={data.avgEpa >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          Avg EPA: {data.avgEpa > 0 ? '+' : ''}{data.avgEpa}
                        </div>
                        <div className="text-sky-400">Avg CPOE: {data.avgCpoe}%</div>
                        <div className="text-slate-300">Success Rate: {data.successRate}% ({data.playCount} plays)</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="avgEpa" name="Avg EPA">
                {(currentFormationData.length > 0 ? currentFormationData : formationMatrix.slice(0, 7)).map((entry, index) => {
                  const isCurrent = entry.coverage.toLowerCase() === context.coverage?.toLowerCase();
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isCurrent ? '#10b981' : (entry.avgEpa >= 0 ? '#0284c7' : '#e11d48')}
                      stroke={isCurrent ? '#ffffff' : undefined}
                      strokeWidth={isCurrent ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800 mt-1">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
              <span>Current Coverage ({context.coverage})</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 bg-sky-600 rounded-sm" />
              <span>Positive EPA</span>
            </span>
          </div>
          <div>Authentic nflverse play counts</div>
        </div>
      </div>

      {/* 3. Assignment Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-xs tracking-wider uppercase">
                Active Player Assignment Breakdown ({players.length} Players)
              </h3>
              <p className="text-[11px] text-slate-400">
                👉 Click any player row below to inspect their telemetrics and scouting profile
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[260px] overflow-y-auto rounded-lg border border-slate-800/80 bg-slate-950">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10 text-[11px]">
              <tr>
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5">Player</th>
                <th className="py-2 px-2.5">Team</th>
                <th className="py-2 px-2.5">Pos</th>
                <th className="py-2 px-2.5">Assignment</th>
                <th className="py-2 px-2.5">Lined Up</th>
                <th className="py-2 px-2.5">Peak MPH</th>
                <th className="py-2 px-2.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {players.map((p) => {
                const isSelected = selectedPlayerId === p.nflId;
                const hasImpact = p.pffSack || p.pffHit || p.pffHurry;

                return (
                  <tr
                    key={p.nflId}
                    onClick={() => onSelectPlayer(isSelected ? null : p.nflId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-950/80 text-white font-semibold'
                        : 'hover:bg-slate-900/80 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-2.5 font-bold text-slate-400">{p.jerseyNumber ?? '—'}</td>
                    <td className="py-2 px-2.5 flex items-center space-x-2">
                      {p.headshotUrl ? (
                        <img src={p.headshotUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-slate-800" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[9px]">
                          {p.team}
                        </div>
                      )}
                      <span className={isSelected ? 'text-white font-bold' : ''}>
                        {p.displayName}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-400 font-bold">{p.team}</td>
                    <td className="py-2 px-2.5 text-slate-400">{p.position}</td>
                    <td className="py-2 px-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.pffRole === 'Pass Route' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        p.pffRole === 'Pass Rush' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        p.pffRole === 'Coverage' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {p.pffRole || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-400">{p.pffPositionLinedUp || '—'}</td>
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{p.playPeakSpeedMph}</td>
                    <td className="py-2 px-2.5 text-right font-bold">
                      {p.pffSack && <span className="text-rose-400 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/50">SACK</span>}
                      {p.pffHit && <span className="text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/50">HIT</span>}
                      {p.pffHurry && <span className="text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded">HURRY</span>}
                      {!hasImpact && <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
