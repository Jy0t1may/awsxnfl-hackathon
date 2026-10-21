import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { PlayBundle } from '../types';
import { DataSourceBadge } from './DataSourceBadge';
import { Activity, SlidersHorizontal, CheckSquare } from 'lucide-react';

interface MultiTrackTimelineProps {
  bundle: PlayBundle;
  currentFrameIdx: number;
  onFrameChange: (frameIdx: number) => void;
  selectedPlayerId: number | null;
  showSourceBadges: boolean;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  bundle,
  currentFrameIdx,
  onFrameChange,
  selectedPlayerId,
  showSourceBadges,
}) => {
  const { frames, events, meta, players } = bundle;
  const currentFrame = frames[currentFrameIdx] || frames[0] || { frameId: 1, events: [], players: [] };
  const targetNflId = selectedPlayerId || meta.focusNflId;

  // Telemetry Curve Visibility Checkboxes
  const [showSpeed, setShowSpeed] = useState(true);
  const [showAccel, setShowAccel] = useState(true);
  const [showSep, setShowSep] = useState(true);
  const [showBallDist, setShowBallDist] = useState(false);

  // Selected player info
  const targetPlayerInfo = useMemo(() => {
    return players.find((p) => p.nflId === targetNflId) || players[0];
  }, [players, targetNflId]);

  // Extract time-series metrics for the target player across all frames
  const timelineData = useMemo(() => {
    return frames.map((f, idx) => {
      const p = f.players.find((pl) => pl.nflId === targetNflId);
      const seconds = (f.frameId * 0.1).toFixed(1);
      return {
        frameIndex: idx,
        frameId: f.frameId,
        timeSec: `${seconds}s`,
        speedMph: p ? p.s_mph : 0,
        accel: p ? p.a : 0,
        distanceOpp: p && p.distOpp !== null ? p.distOpp : null,
        distanceBall: p && p.distBall !== null ? p.distBall : null,
        events: f.events,
      };
    });
  }, [frames, targetNflId]);

  // Summary stats for the target player
  const summaryStats = useMemo(() => {
    let peakSpeed = 0;
    let peakAccel = 0;
    let minSep = Infinity;

    timelineData.forEach((d) => {
      if (d.speedMph > peakSpeed) peakSpeed = d.speedMph;
      if (d.accel > peakAccel) peakAccel = d.accel;
      if (d.distanceOpp !== null && d.distanceOpp < minSep) minSep = d.distanceOpp;
    });

    const currentP = currentFrame.players.find((pl) => pl.nflId === targetNflId);

    return {
      peakSpeed: peakSpeed.toFixed(2),
      peakAccel: peakAccel.toFixed(2),
      minSep: minSep !== Infinity ? minSep.toFixed(2) : '—',
      currentSpeed: currentP ? currentP.s_mph.toFixed(2) : '0.00',
      currentAccel: currentP ? currentP.a.toFixed(2) : '0.00',
      currentSep: currentP && currentP.distOpp !== null ? currentP.distOpp.toFixed(2) : '—',
    };
  }, [timelineData, currentFrame, targetNflId]);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFrameChange(Number(e.target.value));
  };

  const hasLeftAxis = showSpeed || showAccel;
  const hasRightAxis = showSep || showBallDist;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col space-y-3">
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white tracking-wide uppercase">
            10Hz Synchronized Play Telemetry
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-slate-300">
            Target: <strong className="text-white font-bold">{targetPlayerInfo?.displayName || 'Player'} (#{targetPlayerInfo?.jerseyNumber || '—'})</strong>
          </span>
          <DataSourceBadge source="nflverse" visible={showSourceBadges} />
        </div>

        {/* Live Gauges */}
        <div className="flex items-center space-x-3 font-mono text-[11px]">
          {showSpeed && (
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="text-slate-400">Speed:</span>
              <span className="text-emerald-400 font-bold">{summaryStats.currentSpeed} MPH</span>
              <span className="text-slate-600 text-[10px]">(Max: {summaryStats.peakSpeed})</span>
            </div>
          )}

          {showAccel && (
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="text-slate-400">Accel:</span>
              <span className="text-amber-400 font-bold">{summaryStats.currentAccel} yd/s²</span>
            </div>
          )}

          {showSep && (
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="text-slate-400">Defender Sep:</span>
              <span className="text-sky-400 font-bold">{summaryStats.currentSep} yds</span>
            </div>
          )}
        </div>
      </div>

      {/* Video-Editor Scrubber Bar with Clickable Event Markers */}
      <div className="relative pt-2 pb-1 select-none">
        {/* Event Marker Chips positioned along the timeline */}
        <div className="relative h-6 w-full mb-1">
          {events.map((ev, i) => {
            const frameIdx = frames.findIndex((f) => f.frameId === ev.frameId);
            if (frameIdx === -1) return null;
            const pct = (frameIdx / Math.max(1, frames.length - 1)) * 100;
            const isNearCurrent = Math.abs(currentFrameIdx - frameIdx) <= 1;

            return (
              <button
                key={`${ev.frameId}-${ev.event}-${i}`}
                onClick={() => onFrameChange(frameIdx)}
                className={`absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight border transition-all ${
                  isNearCurrent
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md scale-105 z-20'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:border-emerald-500 hover:text-white z-10'
                }`}
                style={{ left: `${pct}%` }}
                title={`Frame ${ev.frameId}: ${ev.event}`}
              >
                {ev.event.replace('autoevent_', '')}
              </button>
            );
          })}
        </div>

        {/* Range Scrubber Input */}
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={currentFrameIdx}
          onChange={handleScrubberChange}
          aria-label="Frame Scrubber"
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-1">
          <span>0.0s (Snap Frame)</span>
          <span>{((frames.length * 0.1) / 2).toFixed(1)}s</span>
          <span>{(frames.length * 0.1).toFixed(1)}s (Total)</span>
        </div>
      </div>

      {/* Telemetry Metric Curve Selector Checkboxes (Issue #6) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-300 font-bold uppercase text-[11px]">Select Telemetrics to Plot:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <label className="flex items-center space-x-1.5 cursor-pointer text-emerald-400 hover:text-emerald-300 select-none">
            <input
              type="checkbox"
              checked={showSpeed}
              onChange={(e) => setShowSpeed(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-semibold">Speed (MPH)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-amber-400 hover:text-amber-300 select-none">
            <input
              type="checkbox"
              checked={showAccel}
              onChange={(e) => setShowAccel(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-semibold">Acceleration (yd/s²)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-sky-400 hover:text-sky-300 select-none">
            <input
              type="checkbox"
              checked={showSep}
              onChange={(e) => setShowSep(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-semibold">Defender Separation (yds)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-orange-400 hover:text-orange-300 select-none">
            <input
              type="checkbox"
              checked={showBallDist}
              onChange={(e) => setShowBallDist(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-semibold">Distance to Ball (yds)</span>
          </label>
        </div>
      </div>

      {/* Synchronized Recharts Area Chart */}
      <div className="w-full h-[155px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={timelineData}
            onClick={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                onFrameChange(state.activeTooltipIndex);
              }
            }}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="timeSec"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval={Math.max(1, Math.floor(frames.length / 8))}
            />

            {/* Left Y Axis for Speed / Accel */}
            {hasLeftAxis && (
              <YAxis
                yAxisId="left"
                tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 4']}
              />
            )}

            {/* Right Y Axis for Separation / Ball distance */}
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 2']}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur-md">
                      <div className="font-bold text-white mb-1">
                        Frame {data.frameId} ({data.timeSec})
                      </div>
                      {showSpeed && <div className="text-emerald-400">Speed: {data.speedMph} MPH</div>}
                      {showAccel && <div className="text-amber-400">Accel: {data.accel} yd/s²</div>}
                      {showSep && <div className="text-sky-400">Defender Sep: {data.distanceOpp ?? '—'} yds</div>}
                      {showBallDist && <div className="text-orange-400">Ball Dist: {data.distanceBall ?? '—'} yds</div>}
                      {data.events.length > 0 && (
                        <div className="text-purple-300 text-[10px] mt-1 pt-1 border-t border-slate-800">
                          Events: {data.events.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Vertical Playhead Line synced to current frame */}
            <ReferenceLine
              x={timelineData[currentFrameIdx]?.timeSec}
              yAxisId={hasLeftAxis ? "left" : "right"}
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="2 2"
            />

            {/* Speed Curve */}
            {showSpeed && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="speedMph"
                name="Speed (MPH)"
                stroke="#10b981"
                strokeWidth={2.2}
                fill="url(#speedGradient)"
              />
            )}

            {/* Accel Curve */}
            {showAccel && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="accel"
                name="Accel (yd/s²)"
                stroke="#f59e0b"
                strokeWidth={1.8}
                dot={false}
              />
            )}

            {/* Defender Distance Curve */}
            {showSep && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="distanceOpp"
                name="Defender Sep (yds)"
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            )}

            {/* Ball Distance Curve */}
            {showBallDist && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="distanceBall"
                name="Distance to Ball (yds)"
                stroke="#f97316"
                strokeWidth={1.8}
                strokeDasharray="2 2"
                dot={false}
              />
            )}

            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
