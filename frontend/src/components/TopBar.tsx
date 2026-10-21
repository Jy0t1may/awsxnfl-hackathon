import React from 'react';
import { 
  Trophy, 
  Compass, 
  Users, 
  Layers,
  Calendar,
  Clock,
  ChevronDown
} from 'lucide-react';
import { PersonaMode, GameItem } from '../types';

interface TopBarProps {
  currentPersona: PersonaMode;
  onSelectPersona: (persona: PersonaMode) => void;
  showSourceBadges: boolean;
  onToggleSourceBadges: () => void;
  allGames: GameItem[];
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  selectedGameId: number;
  onSelectGame: (gameId: number) => void;
  selectedQuarter: number; // 0 for All, 1..4
  onSelectQuarter: (q: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPersona,
  onSelectPersona,
  showSourceBadges,
  onToggleSourceBadges,
  allGames,
  selectedWeek,
  onSelectWeek,
  selectedGameId,
  onSelectGame,
  selectedQuarter,
  onSelectQuarter,
}) => {
  // Available weeks
  const availableWeeks = Array.from(new Set(allGames.map((g) => g.week))).sort((a, b) => a - b);

  // Filter games by selected week if week > 0
  const filteredGames = selectedWeek === 0 
    ? allGames 
    : allGames.filter((g) => g.week === selectedWeek);

  const personas: { id: PersonaMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      id: 'coach', 
      label: 'Coach View', 
      icon: <Compass className="w-4 h-4 text-emerald-400" />, 
      desc: 'Offensive Scheme, Alignments, Formation & Defensive Shell EPA' 
    },
    { 
      id: 'recruiter', 
      label: 'Recruiter View', 
      icon: <Users className="w-4 h-4 text-amber-400" />, 
      desc: 'PFR Combine Drills, Positional Percentiles & Tracked In-Game Speed' 
    },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-50 shadow-xl backdrop-blur-md">
      {/* Top Main Bar */}
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-white font-mono">
                GRIDIRON<span className="text-emerald-400">LENS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                NFL Visual Analytics
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Next Gen Stats 10Hz Tracking • nflverse PBP • Pro Football Reference
            </p>
          </div>
        </div>

        {/* Match Navigation (Week & Game Selector) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Filter Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedWeek}
              onChange={(e) => onSelectWeek(Number(e.target.value))}
              aria-label="Filter by NFL Week"
              className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-900">All Weeks (1-8)</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w} className="bg-slate-900">Week {w}</option>
              ))}
            </select>
          </div>

          {/* Match Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase">Match:</span>
            <select
              value={selectedGameId}
              onChange={(e) => onSelectGame(Number(e.target.value))}
              aria-label="Select Match"
              className="bg-transparent text-xs font-mono text-slate-100 font-semibold focus:outline-none cursor-pointer max-w-[280px] sm:max-w-[420px] truncate"
            >
              {filteredGames.map((g) => (
                <option key={g.gameId} value={g.gameId} className="bg-slate-900 text-white">
                  {g.fullTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Quarter Pills */}
          <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            {[
              { q: 0, label: 'All' },
              { q: 1, label: 'Q1' },
              { q: 2, label: 'Q2' },
              { q: 3, label: 'Q3' },
              { q: 4, label: 'Q4' },
            ].map(({ q, label }) => (
              <button
                key={q}
                onClick={() => onSelectQuarter(q)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedQuarter === q
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Controls: Data Source Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleSourceBadges}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showSourceBadges
                ? 'bg-slate-800 text-slate-100 border-emerald-500/50 shadow-inner'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle data origin tags ([nflverse], [PFR])"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Origin Badges:</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                showSourceBadges ? 'bg-emerald-500 text-black font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showSourceBadges ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* 2-Persona Mode Tabs */}
      <div className="bg-slate-900/70 border-t border-slate-800/80 px-4">
        <div className="max-w-[1920px] mx-auto flex items-center space-x-2">
          {personas.map((persona) => {
            const isCurrent = currentPersona === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => onSelectPersona(persona.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 border-b-2 text-xs font-bold tracking-wide transition-all ${
                  isCurrent
                    ? 'border-emerald-400 text-white bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                {persona.icon}
                <span className="font-mono text-sm">{persona.label}</span>
                <span className="text-[11px] font-normal text-slate-400 hidden md:inline">
                  — {persona.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
