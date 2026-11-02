import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { maxComplexity, type EslintLike } from '../../../scripts/sonar/max-complexity.ts';

const fixture = (name: string) => path.resolve('tests/fixtures/complexity', name);

describe('maxComplexity (FR-014)', () => {
  it('sobre as quatro fixtures → ciclomática 11 e cognitiva 16', async () => {
    const files = ['cyclomatic-10.ts', 'cyclomatic-11.ts', 'cognitive-15.ts', 'cognitive-16.ts'];
    await expect(maxComplexity(files.map(fixture))).resolves.toEqual({
      ciclomaticaMax: 11,
      cognitivaMax: 16,
    });
  }, 60_000);

  it('só sobre cyclomatic-10 e cognitive-15 → 10 e 15', async () => {
    await expect(
      maxComplexity([fixture('cyclomatic-10.ts'), fixture('cognitive-15.ts')]),
    ).resolves.toEqual({ ciclomaticaMax: 10, cognitivaMax: 15 });
  }, 60_000);

  it('arquivo sem funções → 0 e 0', async () => {
    await expect(maxComplexity([path.resolve('tests/setup/jest-dom.ts')])).resolves.toEqual({
      ciclomaticaMax: 0,
      cognitivaMax: 0,
    });
  }, 60_000);

  it('lista vazia → 0 e 0 sem chamar o ESLint', async () => {
    const factory = (): EslintLike => {
      throw new Error('não deveria chamar');
    };
    await expect(maxComplexity([], factory)).resolves.toEqual({
      ciclomaticaMax: 0,
      cognitivaMax: 0,
    });
  });

  it('usa o número da mensagem, não a contagem de mensagens', async () => {
    const factory = (): EslintLike => ({
      lintFiles: async () => [
        {
          messages: [
            {
              ruleId: 'complexity',
              message: "Function 'a' has a complexity of 3. Maximum allowed is 0.",
            },
            {
              ruleId: 'complexity',
              message: "Function 'b' has a complexity of 7. Maximum allowed is 0.",
            },
            {
              ruleId: 'sonarjs/cognitive-complexity',
              message:
                'Refactor this function to reduce its Cognitive Complexity from 4 to the 0 allowed.',
            },
            { ruleId: null, message: 'Parsing error' },
          ],
        },
      ],
    });
    await expect(maxComplexity(['x.ts'], factory)).resolves.toEqual({
      ciclomaticaMax: 7,
      cognitivaMax: 4,
    });
  });
});
