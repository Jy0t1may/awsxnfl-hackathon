import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  MousePointerClick,
  Users
} from 'lucide-react';
import { PlayBundle, ActivePlayer, PlayerFrame } from '../types';

interface FieldCanvasProps {
  bundle: PlayBundle;
  currentFrameIdx: number;
  onFrameChange: (frameIdx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  selectedPlayerId: number | null;
  onSelectPlayer: (nflId: number | null) => void;
}

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  bundle,
  currentFrameIdx,
  onFrameChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Overlay toggles
  const [showTrails, setShowTrails] = useState(true);
  const [showTethers, setShowTethers] = useState(true);
  const [showRoleLabels, setShowRoleLabels] = useState(true);
  const [showAngles, setShowAngles] = useState(true);

  // Roster team filter for bottom strip
  const [rosterTeamTab, setRosterTeamTab] = useState<'offense' | 'defense'>('offense');

  // Hover state for tooltip
  const [hoveredPlayer, setHoveredPlayer] = useState<{
    player: PlayerFrame;
    activeInfo?: ActivePlayer;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  const { frames, context, players } = bundle;
  const currentFrame = frames[currentFrameIdx] || frames[0] || { frameId: 1, events: [], players: [] };
  const snapFrameId = context.snapFrameId || 6;

  // Build lookup map for active players info
  const playerInfoMap = useMemo(() => {
    const map = new Map<number, ActivePlayer>();
    players.forEach((p) => map.set(p.nflId, p));
    return map;
  }, [players]);

  // Pre-calculate full trajectories for trails
  const playerTrajectories = useMemo(() => {
    const map = new Map<number, { preSnap: { x: number; y: number }[]; postSnap: { x: number; y: number }[] }>();
    frames.forEach((f) => {
      const isPreSnap = f.frameId < snapFrameId;
      f.players.forEach((p) => {
        if (!p.nflId) return;
        if (!map.has(p.nflId)) {
          map.set(p.nflId, { preSnap: [], postSnap: [] });
        }
        const traj = map.get(p.nflId)!;
        if (isPreSnap) {
          traj.preSnap.push({ x: p.x, y: p.y });
        } else {
          traj.postSnap.push({ x: p.x, y: p.y });
        }
      });
    });
    return map;
  }, [frames, snapFrameId]);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Scaling factors (Field: 0..120 X yards, 0..53.3 Y yards)
    const toCanvasX = (yardX: number) => (yardX / 120.0) * width;
    const toCanvasY = (yardY: number) => (yardY / 53.333) * height;

    // 1. Draw Field Turf & Striping
    ctx.fillStyle = '#0f291e';
    ctx.fillRect(0, 0, width, height);

    // Alternate 5-yard grass strips
    for (let x = 10; x < 110; x += 5) {
      if ((x / 5) % 2 === 0) {
        ctx.fillStyle = '#143527';
        ctx.fillRect(toCanvasX(x), 0, toCanvasX(x + 5) - toCanvasX(x), height);
      }
    }

    // Endzones
    ctx.fillStyle = '#0a1d15';
    ctx.fillRect(0, 0, toCanvasX(10), height);
    ctx.fillRect(toCanvasX(110), 0, toCanvasX(10), height);

    // Endzone Text
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = 'bold 24px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Left team
    ctx.save();
    ctx.translate(toCanvasX(5), height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(context.possessionTeam || 'OFFENSE', 0, 0);
    ctx.restore();

    // Right team
    ctx.save();
    ctx.translate(toCanvasX(115), height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(context.defensiveTeam || 'DEFENSE', 0, 0);
    ctx.restore();
    ctx.restore();

    // Yard Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 10; x <= 110; x += 5) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      // Yard numbers (every 10 yards)
      if (x % 10 === 0 && x > 10 && x < 110) {
        const yardNum = x <= 60 ? x - 10 : 110 - x;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${yardNum}`, cx, 16);
        ctx.fillText(`${yardNum}`, cx, height - 8);
      }
    }

    // Hash Marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    const topHashY = toCanvasY(23.58);
    const bottomHashY = toCanvasY(29.75);
    for (let x = 11; x < 110; x += 1) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, topHashY - 3);
      ctx.lineTo(cx, topHashY + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bottomHashY - 3);
      ctx.lineTo(cx, bottomHashY + 3);
      ctx.stroke();
      // Sidelines
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, height - 4);
      ctx.lineTo(cx, height);
      ctx.stroke();
    }

    // Boundary Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Line of Scrimmage (LOS) & First Down Line
    const losYards = 10 + (context.yardlineSide === context.possessionTeam ? context.yardlineNumber : 100 - context.yardlineNumber);
    const firstDownYards = losYards + context.yardsToGo;

    // LOS (Blue Line)
    const losX = toCanvasX(losYards);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(losX, 0);
    ctx.lineTo(losX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // First Down (Yellow Line)
    const fdX = toCanvasX(firstDownYards);
    if (fdX <= toCanvasX(110)) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fdX, 0);
      ctx.lineTo(fdX, height);
      ctx.stroke();
    }

    // 2. Render Motion & Route Trails (Overlay)
    if (showTrails) {
      playerTrajectories.forEach((traj, nflId) => {
        const isSelected = selectedPlayerId === nflId;
        
        // Pre-Snap (Dashed)
        if (traj.preSnap.length > 1) {
          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.9)' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = isSelected ? 2.5 : 1.2;
          traj.preSnap.forEach((pt, idx) => {
            const px = toCanvasX(pt.x);
            const py = toCanvasY(pt.y);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }

        // Post-Snap (Solid)
        if (traj.postSnap.length > 1) {
          ctx.beginPath();
          ctx.setLineDash([]);
          ctx.strokeStyle = isSelected ? 'rgba(52, 211, 153, 0.95)' : 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = isSelected ? 3 : 1.5;
          traj.postSnap.forEach((pt, idx) => {
            const px = toCanvasX(pt.x);
            const py = toCanvasY(pt.y);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
    }

    // 3. Render Separation Tethers (Overlay)
    if (showTethers) {
      const offPlayers = currentFrame.players.filter((p) => p.team === context.possessionTeam);
      const defPlayers = currentFrame.players.filter((p) => p.team === context.defensiveTeam);

      for (const off of offPlayers) {
        let closestDef: PlayerFrame | null = null;
        let minDist = Infinity;
        for (const def of defPlayers) {
          const d = Math.sqrt((off.x - def.x) ** 2 + (off.y - def.y) ** 2);
          if (d < minDist) {
            minDist = d;
            closestDef = def;
          }
        }

        const isSkillOrSelected = selectedPlayerId === off.nflId || minDist < 3.5;
        if (closestDef !== null && isSkillOrSelected && minDist < 15.0) {
          const defPlayer: PlayerFrame = closestDef;
          const x1 = toCanvasX(off.x);
          const y1 = toCanvasY(off.y);
          const x2 = toCanvasX(defPlayer.x);
          const y2 = toCanvasY(defPlayer.y);

          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = selectedPlayerId === off.nflId ? 'rgba(56, 189, 248, 0.85)' : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = selectedPlayerId === off.nflId ? 2 : 1;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Tether yardage badge
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(mx - 15, my - 8, 30, 16);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.strokeRect(mx - 15, my - 8, 30, 16);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${minDist.toFixed(1)}y`, mx, my);
        }
      }
    }

    // 4. Render Football & Players
    const football = currentFrame.players.find((p) => p.team === 'football');

    currentFrame.players.forEach((player) => {
      if (player.team === 'football') return;

      const px = toCanvasX(player.x);
      const py = toCanvasY(player.y);
      const isOffense = player.team === context.possessionTeam;
      const isSelected = selectedPlayerId === player.nflId;
      const pInfo = player.nflId ? playerInfoMap.get(player.nflId) : undefined;

      // 100% full opacity for all players (spotlight removed)
      ctx.globalAlpha = 1.0;

      // DUAL-ANGLE VISUALIZATION:
      if (showAngles) {
        // A. Translucent Orientation Viewing Cone
        const radO = (player.o * Math.PI) / 180;
        const coneAngle = (25 * Math.PI) / 180;
        const coneLength = 22;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, coneLength, radO - coneAngle, radO + coneAngle);
        ctx.closePath();
        ctx.fillStyle = isOffense ? 'rgba(56, 189, 248, 0.18)' : 'rgba(244, 63, 94, 0.18)';
        ctx.fill();
        ctx.restore();

        // B. Direction of Motion Velocity Arrow
        if (player.s_mph > 1.0) {
          const radDir = (player.dir * Math.PI) / 180;
          const arrowLen = Math.min(32, Math.max(10, player.s_mph * 1.3));
          const arrowEndX = px + Math.sin(radDir) * arrowLen;
          const arrowEndY = py - Math.cos(radDir) * arrowLen;

          ctx.save();
          ctx.strokeStyle = isOffense ? '#38bdf8' : '#fb7185';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(arrowEndX, arrowEndY);
          ctx.stroke();

          // Arrowhead
          const headLen = 4;
          const angle = Math.atan2(arrowEndY - py, arrowEndX - px);
          ctx.beginPath();
          ctx.moveTo(arrowEndX, arrowEndY);
          ctx.lineTo(
            arrowEndX - headLen * Math.cos(angle - Math.PI / 6),
            arrowEndY - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            arrowEndX - headLen * Math.cos(angle + Math.PI / 6),
            arrowEndY - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.fillStyle = isOffense ? '#38bdf8' : '#fb7185';
          ctx.fill();
          ctx.restore();
        }
      }

      // Highlight Halo for Selected player
      if (isSelected) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }

      // Player Circle (High Contrast Dot)
      const playerRadius = 9;
      ctx.beginPath();
      ctx.arc(px, py, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = isOffense ? '#0284c7' : '#e11d48'; // Offense Sky-Blue / Defense Crimson
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Jersey Number inside Circle
      if (player.jersey !== null) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${player.jersey}`, px, py);
      }

      // Role Label Badge (Overlay)
      if (showRoleLabels && pInfo) {
        const roleText = pInfo.pffRole || pInfo.position;
        if (roleText && roleText !== 'None') {
          ctx.save();
          ctx.font = 'bold 8px ui-monospace, monospace';
          const textW = ctx.measureText(roleText).width;
          const labelX = px;
          const labelY = py + 15;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(labelX - textW / 2 - 3, labelY - 5, textW + 6, 10);
          ctx.fillStyle = isOffense ? '#7dd3fc' : '#fda4af';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(roleText, labelX, labelY);
          ctx.restore();
        }
      }
    });

    // Draw Football
    if (football) {
      const bx = toCanvasX(football.x);
      const by = toCanvasY(football.y);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 4.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#92400e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // White laces
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 2);
      ctx.lineTo(bx + 2, by + 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }, [
    currentFrame,
    context,
    selectedPlayerId,
    showTrails,
    showTethers,
    showRoleLabels,
    showAngles,
    playerInfoMap,
    playerTrajectories,
  ]);

  // Robust Player Click Handler (24px hit radius with closest player resolution)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const toCanvasX = (yardX: number) => (yardX / 120.0) * rect.width;
    const toCanvasY = (yardY: number) => (yardY / 53.333) * rect.height;

    let closestNflId: number | null = null;
    let minDistance = 24; // Generous 24px tolerance

    for (const player of currentFrame.players) {
      if (!player.nflId) continue;
      const px = toCanvasX(player.x);
      const py = toCanvasY(player.y);
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < minDistance) {
        minDistance = dist;
        closestNflId = player.nflId;
      }
    }

    onSelectPlayer(closestNflId === selectedPlayerId ? null : closestNflId);
  };

  // Hover handler for tooltip
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverY = e.clientY - rect.top;

    const toCanvasX = (yardX: number) => (yardX / 120.0) * rect.width;
    const toCanvasY = (yardY: number) => (yardY / 53.333) * rect.height;

    let closest: { player: PlayerFrame; activeInfo?: ActivePlayer; canvasX: number; canvasY: number } | null = null;
    let minDistance = 20;

    for (const player of currentFrame.players) {
      if (!player.nflId) continue;
      const px = toCanvasX(player.x);
      const py = toCanvasY(player.y);
      const dist = Math.hypot(hoverX - px, hoverY - py);
      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          player,
          activeInfo: playerInfoMap.get(player.nflId),
          canvasX: px,
          canvasY: py,
        };
      }
    }
    setHoveredPlayer(closest);
  };

  // Active offense and defense player lists for the bottom roster strip
  const offensePlayers = useMemo(() => {
    return players.filter((p) => p.team === context.possessionTeam);
  }, [players, context.possessionTeam]);

  const defensePlayers = useMemo(() => {
    return players.filter((p) => p.team !== context.possessionTeam);
  }, [players, context.possessionTeam]);

  const activeRosterList = rosterTeamTab === 'offense' ? offensePlayers : defensePlayers;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Field Toolbar Header */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Play Headline & Down/Dist */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono">
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {context.possessionTeam}
            </span>
            <span className="text-slate-400">vs</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {context.defensiveTeam}
            </span>
          </div>
          <div className="font-mono text-emerald-400 font-semibold">
            Q{context.quarter} {context.down}&{context.yardsToGo} @ {context.yardlineSide} {context.yardlineNumber}
          </div>
          <div className="text-slate-400 font-mono text-[11px] hidden md:inline">
            Clock: {context.gameClock}
          </div>
        </div>

        {/* Visual Overlays Checkboxes */}
        <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Trails</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showTethers}
              onChange={(e) => setShowTethers(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Tethers</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showAngles}
              onChange={(e) => setShowAngles(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Cones & Vectors</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showRoleLabels}
              onChange={(e) => setShowRoleLabels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>PFF Roles</span>
          </label>
        </div>
      </div>

      {/* Field Canvas Container */}
      <div 
        ref={containerRef} 
        className="relative w-full aspect-[2.25/1] min-h-[320px] max-h-[500px] bg-field-dark overflow-hidden select-none cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredPlayer(null)}
          className="w-full h-full block"
        />

        {/* Hover Tooltip */}
        {hoveredPlayer && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700 text-slate-100 rounded-lg p-2.5 shadow-2xl text-xs backdrop-blur-sm -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${hoveredPlayer.canvasX}px`,
              top: `${hoveredPlayer.canvasY}px`,
            }}
          >
            <div className="flex items-center space-x-2 font-bold text-white mb-1">
              <span>#{hoveredPlayer.player.jersey || '—'}</span>
              <span>{hoveredPlayer.activeInfo?.displayName || hoveredPlayer.player.team}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                {hoveredPlayer.activeInfo?.position || hoveredPlayer.player.team}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-slate-300">
              <div>Speed: <span className="text-emerald-400 font-bold">{hoveredPlayer.player.s_mph} MPH</span></div>
              <div>Accel: <span className="text-amber-400">{hoveredPlayer.player.a} yd/s²</span></div>
              <div>Defender Sep: <span className="text-sky-400">{hoveredPlayer.player.distOpp ?? '—'} yds</span></div>
              <div>Ball Dist: <span className="text-slate-300">{hoveredPlayer.player.distBall ?? '—'} yds</span></div>
            </div>
          </div>
        )}

        {/* Selected Player Halo Callout */}
        {selectedPlayerId && (
          <div className="absolute top-3 left-3 bg-slate-950/90 border border-sky-500 rounded-lg px-3 py-1.5 flex items-center space-x-2 shadow-lg backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <span className="text-xs font-mono text-slate-300">
              Tracking Focus: <strong className="text-white">{playerInfoMap.get(selectedPlayerId)?.displayName || `#${selectedPlayerId}`}</strong>
            </span>
            <button
              onClick={() => onSelectPlayer(null)}
              className="text-slate-400 hover:text-white text-xs ml-2"
              title="Clear focus"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Events Badge */}
        {currentFrame.events.length > 0 && (
          <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg backdrop-blur-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentFrame.events.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePlay}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-md"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => onFrameChange(Math.max(0, currentFrameIdx - 1))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Step Back (0.1s)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onFrameChange(Math.min(frames.length - 1, currentFrameIdx + 1))}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Step Forward (0.1s)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onFrameChange(0)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Reset to Frame 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const snapIdx = frames.findIndex((f) => f.frameId === snapFrameId);
              if (snapIdx !== -1) onFrameChange(snapIdx);
            }}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[11px] font-mono text-slate-300"
          >
            Snap Frame
          </button>
        </div>

        <div className="font-mono text-slate-400 flex items-center space-x-2">
          <span>Frame: <strong className="text-white">{currentFrameIdx + 1}</strong> / {frames.length}</span>
          <span className="text-slate-600">•</span>
          <span>Time: <strong className="text-emerald-400">{((currentFrameIdx + 1) * 0.1).toFixed(1)}s</strong></span>
        </div>

        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
          <span className="text-slate-500 mr-1">Speed:</span>
          {[0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-1 rounded border transition-all ${
                playbackSpeed === s
                  ? 'bg-slate-800 border-emerald-500/50 text-emerald-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Interactive On-Field Roster Strip (Guarantees 100% clickability for all players!) */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-col space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 uppercase text-[10px] font-bold">Quick Player Selector:</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setRosterTeamTab('offense')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  rosterTeamTab === 'offense'
                    ? 'bg-sky-500 text-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {context.possessionTeam} Offense ({offensePlayers.length})
              </button>
              <button
                onClick={() => setRosterTeamTab('defense')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  rosterTeamTab === 'defense'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {context.defensiveTeam} Defense ({defensePlayers.length})
              </button>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">Click any badge to lock telemetry</span>
        </div>

        {/* Horizontal Player Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-thin">
          {activeRosterList.map((p) => {
            const isSelected = selectedPlayerId === p.nflId;
            const curP = currentFrame.players.find((pl) => pl.nflId === p.nflId);
            const liveSpeed = curP ? curP.s_mph : 0;

            return (
              <button
                key={p.nflId}
                onClick={() => onSelectPlayer(isSelected ? null : p.nflId)}
                className={`flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-black border-sky-400 font-bold shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>#{p.jerseyNumber ?? '—'} {p.displayName.split(' ').pop()} ({p.position})</span>
                <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-black' : 'text-emerald-400'}`}>
                  {liveSpeed.toFixed(1)}mph
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
