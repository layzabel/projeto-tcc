// Indicador circular do tempo usado, com rótulo acessível e tabela equivalente (R15, FR-052).

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Ring({ used, limit }: { used: number; limit: number }) {
  const fraction = Math.min(1, used / limit);
  const label = `${used} de ${limit} minutos usados`;
  return (
    <figure className="anel-figura">
      <svg
        className="anel"
        viewBox="0 0 140 140"
        width="140"
        height="140"
        role="img"
        aria-label={label}
      >
        <circle cx="70" cy="70" r={RADIUS} className="anel-uso-fundo" />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          className="anel-uso"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="78" textAnchor="middle" className="anel-texto" aria-hidden="true">
          {used}/{limit}
        </text>
      </svg>
      <table className="sr-only">
        <caption>Tempo de tela de hoje</caption>
        <tbody>
          <tr>
            <th scope="row">Minutos usados</th>
            <td>{used}</td>
          </tr>
          <tr>
            <th scope="row">Limite de hoje (minutos)</th>
            <td>{limit}</td>
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
