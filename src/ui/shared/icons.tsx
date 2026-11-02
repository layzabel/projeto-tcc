// Ícones SVG inline das telas infantis (nenhuma imagem externa).

const common = { viewBox: '0 0 64 64', 'aria-hidden': true, focusable: false } as const;

export function PlayIcon() {
  return (
    <svg {...common}>
      <rect
        x="8"
        y="30"
        width="22"
        height="22"
        rx="3"
        fill="#e2553f"
        stroke="#1f2933"
        strokeWidth="2"
      />
      <rect
        x="34"
        y="30"
        width="22"
        height="22"
        rx="3"
        fill="#2f78d6"
        stroke="#1f2933"
        strokeWidth="2"
      />
      <rect
        x="21"
        y="8"
        width="22"
        height="22"
        rx="3"
        fill="#f2b705"
        stroke="#1f2933"
        strokeWidth="2"
      />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg {...common}>
      <path d="M8 14q12-6 24 2v38q-12-8-24-2z" fill="#7cc4a4" stroke="#1f2933" strokeWidth="2" />
      <path d="M56 14q-12-6-24 2v38q12-8 24-2z" fill="#a2d8bf" stroke="#1f2933" strokeWidth="2" />
    </svg>
  );
}

export function FireflyIcon() {
  return (
    <svg {...common}>
      <ellipse cx="20" cy="22" rx="10" ry="14" fill="#e8f4ff" stroke="#1f2933" strokeWidth="2" />
      <ellipse cx="44" cy="22" rx="10" ry="14" fill="#e8f4ff" stroke="#1f2933" strokeWidth="2" />
      <ellipse cx="32" cy="50" rx="11" ry="9" fill="#fff3a6" stroke="#1f2933" strokeWidth="2" />
      <circle cx="32" cy="32" r="14" fill="#ffd451" stroke="#1f2933" strokeWidth="2" />
      <path d="M26 36q6 5 12 0" fill="none" stroke="#1f2933" strokeWidth="2" />
      <circle cx="27" cy="29" r="2" fill="#1f2933" />
      <circle cx="37" cy="29" r="2" fill="#1f2933" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...common}>
      <path
        d="M40 12L20 32l20 20"
        fill="none"
        stroke="#1f2933"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandIcon() {
  return (
    <svg {...common} className="dica-toque">
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="#1f2933"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
      <circle cx="32" cy="32" r="8" fill="#1f2933" />
    </svg>
  );
}
