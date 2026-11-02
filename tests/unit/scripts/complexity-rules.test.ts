import fs from 'node:fs';
import path from 'node:path';
import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const FIXTURES = path.resolve('tests/fixtures/complexity');
const RULES = new Set(['complexity', 'sonarjs/cognitive-complexity']);

let results: Map<string, Linter.LintMessage[]>;

function functionLine(file: string, name: string): number {
  const lines = fs.readFileSync(path.join(FIXTURES, file), 'utf8').split('\n');
  return lines.findIndex((line) => line.includes(`function ${name}(`)) + 1;
}

function complexityMessages(file: string): Linter.LintMessage[] {
  return (results.get(file) ?? []).filter((m) => m.ruleId !== null && RULES.has(m.ruleId));
}

beforeAll(async () => {
  const eslint = new ESLint({ overrideConfigFile: 'eslint.config.mjs', ignore: false });
  const files = ['cyclomatic-10.ts', 'cyclomatic-11.ts', 'cognitive-15.ts', 'cognitive-16.ts'];
  const lint = await eslint.lintFiles(files.map((file) => path.join(FIXTURES, file)));
  results = new Map(lint.map((r) => [path.basename(r.filePath), r.messages]));
}, 60_000);

describe('limites de complexidade (SC-003)', () => {
  it('sinaliza ciclomática 11 com linha, coluna e nome da função', () => {
    const messages = complexityMessages('cyclomatic-11.ts');
    expect(messages).toHaveLength(1);
    const [message] = messages;
    expect(message?.ruleId).toBe('complexity');
    expect(message?.message).toContain('cyclomatic11');
    expect(message?.message).toContain('11');
    expect(message?.line).toBe(functionLine('cyclomatic-11.ts', 'cyclomatic11'));
    expect(message?.column).toBeGreaterThan(0);
  });

  it('sinaliza cognitiva 16 com linha e coluna da função', () => {
    const messages = complexityMessages('cognitive-16.ts');
    expect(messages).toHaveLength(1);
    const [message] = messages;
    expect(message?.ruleId).toBe('sonarjs/cognitive-complexity');
    expect(message?.message).toContain('16');
    expect(message?.line).toBe(functionLine('cognitive-16.ts', 'cognitive16'));
    expect(message?.column).toBeGreaterThan(0);
  });

  it.each(['cyclomatic-10.ts', 'cognitive-15.ts'])('não sinaliza %s', (file) => {
    expect(complexityMessages(file)).toEqual([]);
  });
});
