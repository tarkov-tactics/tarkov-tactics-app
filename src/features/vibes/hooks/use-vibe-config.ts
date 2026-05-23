'use client';

import { useCallback, useState } from 'react';
import { VIBES, type VibeId, type VibeDefinition, type VibeModifier } from '../types';

const STORAGE_KEY = 'active-vibe';

function readVibe(): VibeId {
  if (typeof window === 'undefined') return 'loot-run';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VIBES.some((v) => v.id === stored)) return stored as VibeId;
    return 'loot-run';
  } catch {
    return 'loot-run';
  }
}

export function useVibeConfig() {
  const [activeVibe, setActiveVibeState] = useState<VibeId>(() => readVibe());

  const setActiveVibe = useCallback((id: VibeId) => {
    setActiveVibeState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  }, []);

  const vibeDefinition: VibeDefinition = VIBES.find((v) => v.id === activeVibe) ?? VIBES[0];
  const vibeModifier: VibeModifier = vibeDefinition.modifier;

  return { activeVibe, setActiveVibe, vibeDefinition, vibeModifier };
}
