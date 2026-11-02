import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKEN_PATTERN = /sq[apu]_[0-9a-f]{40}/;

function candidateFiles(): string[] {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- teste local: usa o git do ambiente
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => file !== '');
  const metrics = fs
    .readdirSync('specs', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join('specs', entry.name, 'metricas-ia.md'));
  return [...new Set([...tracked, ...metrics])].filter(
    (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
  );
}

describe('segredos (SC-008)', () => {
  it('nenhum arquivo versionado nem de métricas contém token SonarQube', () => {
    const token = process.env.SONAR_TOKEN;
    const offenders = candidateFiles().filter((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return (
        TOKEN_PATTERN.test(content) ||
        (token !== undefined && token !== '' && content.includes(token))
      );
    });
    expect(offenders).toEqual([]);
  });

  it('.gitignore ignora .env* e .scannerwork/', () => {
    const lines = fs.readFileSync('.gitignore', 'utf8').split(/\r?\n/);
    expect(lines).toContain('.env*');
    expect(lines).toContain('.scannerwork/');
  });
});
