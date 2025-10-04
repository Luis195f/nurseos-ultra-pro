// apps/web/src/services/featureFlags.ts
// -----------------------------------------------------------------------------
// Flags y gate de características SIN JSX (compatible con .ts y esbuild)
// -----------------------------------------------------------------------------

import type { ReactNode } from 'react';

export const flags = {
  VOICE_NOTES: (import.meta as any).env?.VITE_FEATURE_VOICE_NOTES === 'true',
  HANDOFF_PRO: (import.meta as any).env?.VITE_FEATURE_HANDOFF_PRO === 'true',
  BCMA_PRO:    (import.meta as any).env?.VITE_FEATURE_BCMA_PRO === 'true',
} as const;

// Componente/gate que retorna los children directamente (sin <> fragments)
export function FeatureGate({
  when, fallback = null, children,
}: { when: boolean; fallback?: ReactNode; children: ReactNode; }) {
  return (when ? children : (fallback ?? null)) as any;
}


