import { SUPERVISION_GUIDANCE } from '../../../content/consent';

export function Done({ onStart }: { onStart: () => void }) {
  return (
    <>
      <h1>Tudo pronto!</h1>
      <p className="sbp">{SUPERVISION_GUIDANCE}</p>
      <p>
        Para entrar na área dos adultos depois, segure o botão redondo do canto da tela por 3
        segundos e digite a senha.
      </p>
      <div className="acoes">
        <button type="button" className="botao" onClick={onStart}>
          Começar
        </button>
      </div>
    </>
  );
}
