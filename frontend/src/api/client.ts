import { PlayBundle, GameItem, PlaySummary } from '../types';

// Use environment variable if provided (e.g. on Vercel: VITE_API_BASE_URL=https://my-backend.onrender.com)
// Otherwise defaults to relative '/api'
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') || '/api';

export async function fetchGames(): Promise<GameItem[]> {
  try {
    const res = await fetch(`${API_BASE}/games`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend /api/games unreachable, falling back to static /data/games.json', err);
    try {
      const fallbackRes = await fetch('/data/games.json');
      if (fallbackRes.ok) return await fallbackRes.json();
    } catch {
      // ignore
    }
    return [];
  }
}

export async function fetchPlaysForGame(gameId: number, quarter?: number): Promise<PlaySummary[]> {
  try {
    let url = `${API_BASE}/plays?game_id=${gameId}`;
    if (quarter !== undefined && quarter > 0) {
      url += `&quarter=${quarter}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Backend /api/plays unreachable, falling back to static /data/plays_${gameId}.json`, err);
    try {
      const fallbackRes = await fetch(`/data/plays_${gameId}.json`);
      if (fallbackRes.ok) {
        let plays: PlaySummary[] = await fallbackRes.json();
        if (quarter !== undefined && quarter > 0) {
          plays = plays.filter(p => p.quarter === quarter);
        }
        return plays;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

export async function fetchPlayBundle(gameId: number, playId: number): Promise<PlayBundle> {
  try {
    const res = await fetch(`${API_BASE}/play/${gameId}/${playId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Backend /api/play/${gameId}/${playId} failed, trying static fallback...`, err);
  }

  // Try static fallback bundle if running on standalone static deployment
  try {
    const fallbackRes = await fetch(`/data/plays/${gameId}_${playId}.json`);
    if (fallbackRes.ok) {
      return await fallbackRes.json();
    }
  } catch {
    // fallback failed
  }

  throw new Error(`Failed to load play bundle for game ${gameId} play ${playId}. Backend API not reachable and no static bundle available.`);
}
