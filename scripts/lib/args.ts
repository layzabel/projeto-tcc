import { parseArgs as nodeParseArgs } from 'node:util';

export class ArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgsError';
  }
}

export type CliArgs = {
  etapa?: string;
  sessao: string[];
  correcoes?: number;
  retroativo: boolean;
  obs?: string;
  feature?: string;
};

function parseCorrecoes(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    throw new ArgsError(`--correcoes deve ser um inteiro ≥ 0 (recebido: "${value}")`);
  }
  return Number(value);
}

function parseSessao(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  const ids = value.split(',').map((id) => id.trim());
  if (ids.some((id) => id === '')) {
    throw new ArgsError('--sessao contém um ID vazio');
  }
  return ids;
}

const OPTIONS = {
  etapa: { type: 'string' },
  sessao: { type: 'string' },
  correcoes: { type: 'string' },
  retroativo: { type: 'boolean', default: false },
  obs: { type: 'string' },
  feature: { type: 'string' },
} as const;

function readValues(argv: string[]) {
  try {
    return nodeParseArgs({ args: argv, strict: true, allowPositionals: false, options: OPTIONS })
      .values;
  } catch (error) {
    throw new ArgsError(`argumento inválido: ${(error as Error).message}`);
  }
}

export function parseArgs(argv: string[]): CliArgs {
  const values = readValues(argv);
  return {
    etapa: values.etapa,
    sessao: parseSessao(values.sessao),
    correcoes: parseCorrecoes(values.correcoes),
    retroativo: values.retroativo === true,
    obs: values.obs,
    feature: values.feature,
  };
}
