import React from 'react';
import { PlaySummary } from '../types';
import { Clock, PlayCircle, ChevronRight, Activity } from 'lucide-react';

interface MatchPlayNavigatorProps {
  plays: PlaySummary[];
  selectedPlayId: number;
  onSelectPlay: (playId: number) => void;
  selectedQuarter: number;
}

export const MatchPlayNavigator: React.FC<MatchPlayNavigatorProps> = ({
  plays,
  selectedPlayId,
  onSelectPlay,
  selectedQuarter,
}) => {
  if (!plays.length) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-center text-xs text-slate-400 font-mono">
        No plays found for the selected quarter. Try switching quarters or selecting another match.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Match Play Sequence {selectedQuarter > 0 ? `(Quarter ${selectedQuarter})` : '(Full Game)'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{plays.length} Total Plays</span>
        </div>
        <div className="text-[11px] text-slate-400 italic hidden sm:inline">
          👉 Click any play below to load its 10Hz field tracking & telemetrics
        </div>
      </div>

      {/* Horizontal Play Scroller */}
      <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-thin">
        {plays.map((p) => {
          const isSelected = p.playId === selectedPlayId;
          const isPositiveEpa = (p.epa || 0) >= 0;

          return (
            <button
              key={p.playId}
              onClick={() => onSelectPlay(p.playId)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-left font-mono border transition-all ${
                isSelected
                  ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
              title={p.playDescription}
            >
              <div className="flex items-center justify-between space-x-3 text-[10px] text-slate-400 mb-0.5">
                <span className="font-bold text-slate-300">Q{p.quarter} {p.gameClock}</span>
                <span className="px-1 py-0.2 rounded bg-slate-800 font-bold text-slate-200">
                  {p.possessionTeam}
                </span>
              </div>
              <div className="text-xs font-bold text-white whitespace-nowrap">
                P#{p.playId} • {p.down}&{p.yardsToGo}
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] mt-1">
                <span className={p.playResult >= 0 ? 'text-slate-300' : 'text-rose-400'}>
                  {p.playResult > 0 ? `+${p.playResult}y` : `${p.playResult}y`}
                </span>
                <span>•</span>
                <span className={isPositiveEpa ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {p.epa !== null ? `${p.epa > 0 ? '+' : ''}${p.epa.toFixed(1)} EPA` : '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
