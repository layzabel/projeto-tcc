// Cinco vaga-lumes: um se apaga a cada 20% do limite consumido (FR-007).

import { FIREFLIES } from '../../domain/progress';

export function Fireflies({ lit }: { lit: number }) {
  return (
    <div className="vaga-lumes" role="img" aria-label={`${lit} de ${FIREFLIES} vaga-lumes acesos`}>
      {Array.from({ length: FIREFLIES }, (_, i) => (
        <svg
          key={i}
          className="vaga-lume"
          viewBox="0 0 28 28"
          data-aceso={i < lit ? 'true' : 'false'}
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="14" cy="14" r="11" />
        </svg>
      ))}
    </div>
  );
}
