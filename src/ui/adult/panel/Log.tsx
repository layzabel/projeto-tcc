'use client';

// Aba Registro (FR-040, FR-041): últimos 7 e 30 dias e exportação dos dados.

import { localDate } from '../../../domain/dates';
import { exportFileName, serializeExport, toExport } from '../../../domain/export';
import { dailyAverage, daysWithUse, last30, last7, weekTotal } from '../../../domain/history';
import type { CompleteDocument } from '../../../domain/model';
import { downloadJson } from '../../../platform/download';
import { useServices } from '../../state/services';
import { BarChart } from '../../shared/BarChart';

function brDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',').replace(',0', '');
}

type Props = { doc: CompleteDocument; download?: typeof downloadJson };

export function Log({ doc, download = downloadJson }: Props) {
  const { clock } = useServices();

  const exportData = () => {
    const now = clock.now();
    download(exportFileName(localDate(now)), serializeExport(toExport(doc, now)));
  };

  return (
    <>
      <h2>Registro</h2>
      <BarChart days={last7(doc)} caption="Minutos de uso nos últimos 7 dias" />
      <ul className="resumo">
        <li>Média diária: {decimal(dailyAverage(doc))} min</li>
        <li>Dias com uso nos últimos 7 dias: {daysWithUse(doc)} de 7</li>
        <li>Total da semana: {weekTotal(doc)} min</li>
      </ul>
      <div className="acoes">
        <button type="button" className="botao" onClick={exportData}>
          Exportar
        </button>
      </div>
      <p className="ajuda">
        O arquivo é gerado neste aparelho e contém todos os dados guardados, exceto a senha.
      </p>
      <table>
        <caption>Últimos 30 dias</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Minutos usados</th>
          </tr>
        </thead>
        <tbody>
          {last30(doc).map((d) => (
            <tr key={d.date}>
              <td>{brDate(d.date)}</td>
              <td>{d.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
