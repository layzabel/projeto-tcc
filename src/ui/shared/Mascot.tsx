// Mascote vaga-lume em SVG inline, com humor exposto em data-humor (contracts/screens.md §5).

import type { Mood } from '../../domain/progress';

export type { Mood };

const LABELS: Readonly<Record<Mood, string>> = {
  feliz: 'Vaga-lume feliz',
  calmo: 'Vaga-lume calmo',
  'com-sono': 'Vaga-lume com sono',
  dormindo: 'Vaga-lume dormindo',
  festejando: 'Vaga-lume festejando',
};

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'dormindo') {
    return (
      <g className="mascote-olhos">
        <path d="M40 52q5 4 10 0" />
        <path d="M62 52q5 4 10 0" />
      </g>
    );
  }
  if (mood === 'com-sono') {
    return (
      <g className="mascote-olhos">
        <path d="M40 52h10" />
        <path d="M62 52h10" />
        <circle cx="45" cy="55" r="2.5" className="mascote-pupila" />
        <circle cx="67" cy="55" r="2.5" className="mascote-pupila" />
      </g>
    );
  }
  return (
    <g>
      <circle cx="45" cy="52" r="5" className="mascote-pupila" />
      <circle cx="67" cy="52" r="5" className="mascote-pupila" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'festejando' || mood === 'feliz') {
    return <path d="M46 64q10 10 20 0" className="mascote-boca" />;
  }
  if (mood === 'calmo') {
    return <path d="M48 65q8 5 16 0" className="mascote-boca" />;
  }
  return (
    <ellipse cx="56" cy="66" rx="4" ry={mood === 'com-sono' ? 4 : 2} className="mascote-boca" />
  );
}

export function Mascot({ mood, size = 160 }: { mood: Mood; size?: number }) {
  return (
    <svg
      className="mascote"
      data-humor={mood}
      role="img"
      aria-label={LABELS[mood]}
      viewBox="0 0 112 120"
      width={size}
      height={size}
    >
      <ellipse
        cx="34"
        cy="34"
        rx="18"
        ry="26"
        className="mascote-asa"
        transform="rotate(-30 34 34)"
      />
      <ellipse
        cx="78"
        cy="34"
        rx="18"
        ry="26"
        className="mascote-asa"
        transform="rotate(30 78 34)"
      />
      <ellipse cx="56" cy="98" rx="20" ry="16" className="mascote-luz" />
      <circle cx="56" cy="56" r="30" className="mascote-corpo" />
      <path d="M44 28q-6-14-14-16M68 28q6-14 14-16" className="mascote-antena" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === 'festejando' && (
        <g className="mascote-festa">
          <path d="M26 64l-14-14M86 64l14-14" className="mascote-antena" />
        </g>
      )}
      {mood === 'dormindo' && (
        <text x="88" y="22" className="mascote-zz" aria-hidden="true">
          z z
        </text>
      )}
    </svg>
  );
}
