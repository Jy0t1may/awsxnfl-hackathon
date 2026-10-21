import { PlayBundle, GameItem, PlaySummary } from '../types';

const API_BASE = '/api';

export async function fetchGames(): Promise<GameItem[]> {
  try {
    const res = await fetch(`${API_BASE}/games`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching games:', err);
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
    console.error('Error fetching plays:', err);
    return [];
  }
}

export async function fetchPlayBundle(gameId: number, playId: number): Promise<PlayBundle> {
  const res = await fetch(`${API_BASE}/play/${gameId}/${playId}`);
  if (!res.ok) {
    throw new Error(`Failed to load play bundle for game ${gameId} play ${playId}: ${res.statusText}`);
  }
  return await res.json();
}
