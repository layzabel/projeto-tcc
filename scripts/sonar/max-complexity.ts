import { ESLint } from 'eslint';

export type LintMessage = { ruleId: string | null; message: string };
export type EslintLike = {
  lintFiles: (files: string[]) => Promise<Array<{ messages: LintMessage[] }>>;
};
export type MaxComplexity = { ciclomaticaMax: number; cognitivaMax: number };

// Limite 0 faz as duas regras reportarem cada função com o valor dela (R9).
export function defaultEslintFactory(): EslintLike {
  return new ESLint({
    overrideConfigFile: 'eslint.config.mjs',
    ignore: false,
    overrideConfig: {
      rules: {
        complexity: ['error', 0],
        'sonarjs/cognitive-complexity': ['error', 0],
      },
    },
  });
}

const PATTERNS: Record<string, { key: keyof MaxComplexity; regex: RegExp }> = {
  complexity: { key: 'ciclomaticaMax', regex: /complexity of (\d+)/ },
  'sonarjs/cognitive-complexity': { key: 'cognitivaMax', regex: /from (\d+) to/ },
};

export async function maxComplexity(
  files: readonly string[],
  eslintFactory: () => EslintLike = defaultEslintFactory,
): Promise<MaxComplexity> {
  const result: MaxComplexity = { ciclomaticaMax: 0, cognitivaMax: 0 };
  if (files.length === 0) {
    return result;
  }
  const lint = await eslintFactory().lintFiles([...files]);
  for (const message of lint.flatMap((r) => r.messages)) {
    const pattern = message.ruleId === null ? undefined : PATTERNS[message.ruleId];
    const value = pattern?.regex.exec(message.message)?.[1];
    if (pattern && value !== undefined) {
      result[pattern.key] = Math.max(result[pattern.key], Number(value));
    }
  }
  return result;
}
