// Gráfico de 7 barras em SVG, com tabela equivalente com os mesmos números (R15, FR-052).

import type { DayUsage } from '../../domain/history';

const WIDTH = 280;
const HEIGHT = 160;
const BAR_AREA = 120;

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function BarChart({ days, caption }: { days: readonly DayUsage[]; caption: string }) {
  const max = Math.max(60, ...days.map((d) => d.minutes));
  const slot = WIDTH / days.length;
  const summary = days.map((d) => `${shortDate(d.date)}: ${d.minutes} min`).join('; ');
  return (
    <figure className="grafico">
      <svg
        className="grafico-barras"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label={`${caption}. ${summary}`}
      >
        {days.map((d, i) => {
          const h = (d.minutes / max) * BAR_AREA;
          const x = i * slot + slot * 0.2;
          return (
            <g key={d.date}>
              <rect x={x} y={BAR_AREA - h + 10} width={slot * 0.6} height={h} />
              <text x={x + slot * 0.3} y={HEIGHT - 16} textAnchor="middle">
                {shortDate(d.date)}
              </text>
              <text x={x + slot * 0.3} y={BAR_AREA - h + 6} textAnchor="middle">
                {d.minutes}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {days.map((d) => (
              <th key={d.date} scope="col">
                {shortDate(d.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {days.map((d) => (
              <td key={d.date}>{d.minutes}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </figure>
  );
}
