'use client';

import { useState } from 'react';
import { CONSENT_TEXT } from '../../../content/consent';

export function Consent({ onAccept }: { onAccept: () => void }) {
  const [refused, setRefused] = useState(false);

  return (
    <>
      <h1>Consentimento</h1>
      <p>Antes de começar, leia com atenção quais dados da criança são tratados e por quê.</p>
      <section className="destaque" aria-labelledby="consentimento-titulo">
        <h2 id="consentimento-titulo">Quais dados, para quê e onde ficam</h2>
        {CONSENT_TEXT.map((section) => (
          <div key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </div>
        ))}
      </section>
      {refused && (
        <p role="alert" className="erro">
          Sem o seu aceite, a aplicação não pode ser usada e nenhum dado é guardado.
        </p>
      )}
      <div className="acoes">
        <button type="button" className="botao" onClick={onAccept}>
          Aceito
        </button>
        <button type="button" className="botao botao-secundario" onClick={() => setRefused(true)}>
          Não aceito
        </button>
      </div>
    </>
  );
}
