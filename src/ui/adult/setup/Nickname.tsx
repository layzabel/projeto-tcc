import { NICKNAME_MAX } from '../../../domain/model';

type Props = { value: string; onChange: (value: string) => void; onNext: () => void };

export function NicknameField({ value, onChange }: Omit<Props, 'onNext'>) {
  return (
    <div className="campo">
      <label htmlFor="apelido">Apelido ou primeiro nome (opcional)</label>
      <input
        id="apelido"
        type="text"
        autoComplete="off"
        maxLength={NICKNAME_MAX}
        value={value}
        aria-describedby="apelido-ajuda"
        onChange={(e) => onChange(e.target.value)}
      />
      <span id="apelido-ajuda" className="ajuda">
        Não informe o nome completo da criança. Use um apelido ou só o primeiro nome, com até{' '}
        {NICKNAME_MAX} letras.
      </span>
    </div>
  );
}

export function Nickname({ value, onChange, onNext }: Props) {
  return (
    <>
      <h1>Como chamar a criança?</h1>
      <p>O mascote usa esse nome para cumprimentar a criança. Pode deixar em branco.</p>
      <NicknameField value={value} onChange={onChange} />
      <div className="acoes">
        <button type="button" className="botao" onClick={onNext}>
          Continuar
        </button>
      </div>
    </>
  );
}
