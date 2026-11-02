// Céu do mundo da criança: fase do dia e altura do sol mostram o tempo restante sem números
// (FR-007). Puramente decorativo para leitores de tela.

import type { SkyPhase } from '../../domain/progress';

const SKY_COLORS: Readonly<Record<SkyPhase, string>> = {
  dia: '#bfe3f5',
  tarde: '#f7d6a8',
  anoitecer: '#c8b6e2',
  noite: '#1b2440',
};

const SUN_COLORS: Readonly<Record<SkyPhase, string>> = {
  dia: '#ffcc33',
  tarde: '#ff9a3c',
  anoitecer: '#f08a5d',
  noite: '#f4f1d0',
};

const STARS: readonly (readonly [number, number])[] = [
  [12, 10],
  [28, 22],
  [44, 8],
  [62, 18],
  [78, 6],
  [90, 24],
  [20, 36],
  [70, 34],
];

type Props = { phase: SkyPhase; sun?: number };

export function Sky({ phase, sun = 0 }: Props) {
  const showStars = phase === 'anoitecer' || phase === 'noite';
  // sun = 1 → alto no céu; 0 → no horizonte.
  const sunY = 70 - Math.max(0, Math.min(1, sun)) * 55;
  return (
    <div className="ceu" data-ceu={phase} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" focusable="false">
        <rect width="100" height="100" fill={SKY_COLORS[phase]} />
        {showStars &&
          STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#ffffff" />)}
        {phase === 'noite' ? (
          <circle cx="80" cy="16" r="6" fill={SUN_COLORS.noite} />
        ) : (
          <circle cx="78" cy={sunY} r="8" fill={SUN_COLORS[phase]} />
        )}
        <path d="M0 78 Q25 68 50 76 T100 74 V100 H0 Z" fill="#7fb77e" />
        <path d="M0 86 Q30 80 60 88 T100 84 V100 H0 Z" fill="#5f9e5f" />
      </svg>
    </div>
  );
}
