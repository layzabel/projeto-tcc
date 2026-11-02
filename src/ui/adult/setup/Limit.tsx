import { SBP_RECOMMENDATION } from '../../../content/consent';
import { LIMIT_OPTIONS } from '../../../domain/limits';

type Props = { value: number; onChange: (value: number) => void; onNext: () => void };

export function LimitOptions({
  value,
  onChange,
  legend,
  name,
}: Omit<Props, 'onNext'> & { legend: string; name: string }) {
  return (
    <fieldset className="opcoes">
      <legend className="sr-only">{legend}</legend>
      {LIMIT_OPTIONS.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option} minutos
        </label>
      ))}
    </fieldset>
  );
}

export function Limit({ value, onChange, onNext }: Props) {
  return (
    <>
      <h1>Qual o limite diário?</h1>
      <p className="sbp">{SBP_RECOMMENDATION}</p>
      <p>Escolha quanto tempo de tela a criança pode usar por dia, de 15 a 60 minutos.</p>
      <LimitOptions value={value} onChange={onChange} legend="Limite diário" name="limite" />
      <div className="acoes">
        <button type="button" className="botao" onClick={onNext}>
          Continuar
        </button>
      </div>
    </>
  );
}
