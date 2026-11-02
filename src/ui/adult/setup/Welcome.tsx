export function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h1>Boas-vindas!</h1>
      <p>
        Esta aplicação ajuda a criança de 2 a 5 anos a entender, brincando, quando o tempo de tela
        acaba, e dá a você o controle e o acompanhamento desse tempo.
      </p>
      <p>
        O tempo só é contado dentro da própria aplicação, e todos os dados ficam guardados apenas
        neste aparelho.
      </p>
      <div className="acoes">
        <button type="button" className="botao" onClick={onNext}>
          Começar a configuração
        </button>
      </div>
    </>
  );
}
