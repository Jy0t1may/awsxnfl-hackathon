import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PlayBundle, 
  GameItem, 
  PlaySummary, 
  PersonaMode 
} from './types';
import { 
  fetchGames, 
  fetchPlaysForGame, 
  fetchPlayBundle 
} from './api/client';
import { TopBar } from './components/TopBar';
import { MatchPlayNavigator } from './components/MatchPlayNavigator';
import { FieldCanvas } from './components/FieldCanvas';
import { MultiTrackTimeline } from './components/MultiTrackTimeline';
import { CoachPanel } from './components/CoachPanel';
import { RecruiterPanel } from './components/RecruiterPanel';
import { Loader2, Info } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Mode (Only Coach and Recruiter)
  const [currentPersona, setCurrentPersona] = useState<PersonaMode>('coach');
  const [showSourceBadges, setShowSourceBadges] = useState(true);

  // Match & Play Navigation State
  const [allGames, setAllGames] = useState<GameItem[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedGameId, setSelectedGameId] = useState<number>(2021090900);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0); // 0 = all
  const [gamePlays, setGamePlays] = useState<PlaySummary[]>([]);
  const [selectedPlayId, setSelectedPlayId] = useState<number>(2032);

  // Active Play Bundle State
  const [bundle, setBundle] = useState<PlayBundle | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation & Playhead State
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const lastFrameTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Cross-Filter Selection State
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // 1. Initial Load: Fetch All Games
  useEffect(() => {
    fetchGames().then((games) => {
      setAllGames(games);
      if (games.length > 0) {
        // Default to first game
        setSelectedGameId(games[0].gameId);
        setSelectedWeek(games[0].week);
      }
    });
  }, []);

  // 2. When Game or Quarter changes: Fetch Plays List
  useEffect(() => {
    if (!selectedGameId) return;

    fetchPlaysForGame(selectedGameId, selectedQuarter).then((plays) => {
      setGamePlays(plays);
      if (plays.length > 0) {
        // If current selectedPlayId is not in the new plays list, pick the first one
        const exists = plays.some((p) => p.playId === selectedPlayId);
        if (!exists) {
          handleSelectPlay(plays[0].playId);
        }
      }
    });
  }, [selectedGameId, selectedQuarter]);

  // 3. Load Active Play Bundle (Updates telemetrics for any match & play!)
  const loadPlayData = useCallback(async (gameId: number, playId: number) => {
    setLoading(true);
    setIsPlaying(false);
    try {
      const data = await fetchPlayBundle(gameId, playId);
      setBundle(data);
      setSelectedPlayerId(data.meta.focusNflId || null);

      // Seek to snap frame or key frame if available
      if (data.context.snapFrameId) {
        const snapIdx = data.frames.findIndex((f) => f.frameId === data.context.snapFrameId);
        setCurrentFrameIdx(snapIdx !== -1 ? snapIdx : 0);
      } else {
        setCurrentFrameIdx(0);
      }
    } catch (err) {
      console.error('Failed to load play data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Play Load
  useEffect(() => {
    loadPlayData(2021090900, 2032);
  }, [loadPlayData]);

  // Handle Game Selection
  const handleSelectGame = (gameId: number) => {
    setSelectedGameId(gameId);
    setSelectedQuarter(0); // reset quarter filter
    const found = allGames.find((g) => g.gameId === gameId);
    if (found) setSelectedWeek(found.week);
    
    // Fetch plays for this game and load the first play
    fetchPlaysForGame(gameId, 0).then((plays) => {
      setGamePlays(plays);
      if (plays.length > 0) {
        setSelectedPlayId(plays[0].playId);
        loadPlayData(gameId, plays[0].playId);
      }
    });
  };

  // Handle Week Filter Selection
  const handleSelectWeek = (week: number) => {
    setSelectedWeek(week);
    const weekGames = week === 0 ? allGames : allGames.filter((g) => g.week === week);
    if (weekGames.length > 0) {
      handleSelectGame(weekGames[0].gameId);
    }
  };

  // Handle Play Selection
  const handleSelectPlay = (playId: number) => {
    setSelectedPlayId(playId);
    loadPlayData(selectedGameId, playId);
  };

  // Animation Loop (60fps canvas updating at 10Hz frame rate with speed scaling)
  useEffect(() => {
    if (!isPlaying || !bundle || bundle.frames.length <= 1) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const frameIntervalMs = 100 / playbackSpeed;
    lastFrameTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameIntervalMs) {
        lastFrameTimeRef.current = now;
        setCurrentFrameIdx((prev) => {
          if (prev >= bundle.frames.length - 1) {
            return 0; // Loop back
          }
          return prev + 1;
        });
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, playbackSpeed, bundle]);

  // Keyboard Shortcuts (Space for Play/Pause, Arrows for Frame step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentFrameIdx((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (bundle) {
          setCurrentFrameIdx((prev) => Math.min(bundle.frames.length - 1, prev + 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bundle]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Bar Header with Match & Quarter Navigation */}
      <TopBar
        currentPersona={currentPersona}
        onSelectPersona={setCurrentPersona}
        showSourceBadges={showSourceBadges}
        onToggleSourceBadges={() => setShowSourceBadges((b) => !b)}
        allGames={allGames}
        selectedWeek={selectedWeek}
        onSelectWeek={handleSelectWeek}
        selectedGameId={selectedGameId}
        onSelectGame={handleSelectGame}
        selectedQuarter={selectedQuarter}
        onSelectQuarter={setSelectedQuarter}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto p-4 flex flex-col space-y-3">
        {/* Match Play Timeline Scrubber (Full Match sequence) */}
        <MatchPlayNavigator
          plays={gamePlays}
          selectedPlayId={selectedPlayId}
          onSelectPlay={handleSelectPlay}
          selectedQuarter={selectedQuarter}
        />

        {/* Loading State or Main Dual-Column Grid */}
        {loading || !bundle ? (
          <div className="flex-1 min-h-[450px] flex flex-col items-center justify-center space-y-3 p-12 bg-slate-900/40 rounded-xl border border-slate-800">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-mono text-slate-300">
              Loading 10Hz player tracking coordinates & telemetrics for Play #{selectedPlayId}...
            </p>
          </div>
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: 60fps 2D Football Field + Multi-Track Timeline (7 of 12 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* Field Canvas */}
              <FieldCanvas
                bundle={bundle}
                currentFrameIdx={currentFrameIdx}
                onFrameChange={setCurrentFrameIdx}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
              />

              {/* Multi-Track Scrubber with Checkboxes */}
              <MultiTrackTimeline
                bundle={bundle}
                currentFrameIdx={currentFrameIdx}
                onFrameChange={setCurrentFrameIdx}
                selectedPlayerId={selectedPlayerId}
                showSourceBadges={showSourceBadges}
              />
            </div>

            {/* Right Column: Persona-Specific Dock (Coach View or Recruiter View) (5 of 12 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {currentPersona === 'coach' ? (
                <CoachPanel
                  bundle={bundle}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                  showSourceBadges={showSourceBadges}
                />
              ) : (
                <RecruiterPanel
                  bundle={bundle}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={setSelectedPlayerId}
                  showSourceBadges={showSourceBadges}
                />
              )}
            </div>
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-2 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span>GridironLens v2.0 • NFL Visual Analytics</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Strict Authentic Metrics (No Synthetic Scores)</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-emerald-400">DuckDB 10Hz Engine</span>
          <span className="text-slate-700">|</span>
          <span>Space: Play/Pause • Left/Right: Frame Step</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
