// Texto de consentimento, recomendação da SBP e orientação de uso supervisionado (FR-002, FR-006a).

export const CONSENT_TEXT_VERSION = '1.0';

export type ConsentSection = { title: string; body: string };

export const CONSENT_TEXT: readonly ConsentSection[] = [
  {
    title: 'Quais dados guardamos',
    body:
      'Apelido ou primeiro nome da criança (opcional), os ajustes que você escolher, a senha do ' +
      'adulto em forma não legível e o tempo de uso de cada dia dos últimos 30 dias.',
  },
  {
    title: 'Para quê',
    body:
      'Para contar o tempo de tela da criança, avisar quando ele está acabando, encerrar o uso ' +
      'no limite escolhido e mostrar a você o histórico de uso.',
  },
  {
    title: 'Onde ficam',
    body:
      'Somente neste aparelho. Nada é enviado pela internet, nada é compartilhado com terceiros ' +
      'e não existe cadastro nem conta.',
  },
  {
    title: 'Seus direitos',
    body:
      'Na área dos adultos você pode ver os dados, exportá-los em arquivo e apagar tudo a ' +
      'qualquer momento, o que também retira este consentimento.',
  },
];

export const SBP_RECOMMENDATION =
  'A Sociedade Brasileira de Pediatria recomenda no máximo 1 hora de tela por dia para crianças ' +
  'de 2 a 5 anos, sempre com um adulto por perto.';

export const SUPERVISION_GUIDANCE =
  'Use a aplicação junto com a criança, com um adulto por perto: converse sobre o que ela vê, ' +
  'brinque junto e ajude-a a se despedir da tela quando o tempo acabar.';
