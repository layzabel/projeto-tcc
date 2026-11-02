import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  activeSessionId,
  countPrompts,
  listPrompts,
  readTranscript,
  transcriptDir,
} from '../../../scripts/metrics/transcript.ts';

const FIXTURES = path.resolve('tests/fixtures/transcripts');
const lines = () => readTranscript(FIXTURES, 'session-a');

let tmp: string | undefined;
afterEach(() => {
  if (tmp) {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  tmp = undefined;
});

describe('contagem de prompts (R12)', () => {
  it('conta só os 3 prompts digitados', () => {
    expect(countPrompts(lines())).toBe(3);
  });

  it('lista os 3 textos na ordem', () => {
    const prompts = listPrompts(lines());
    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toContain('/speckit-plan');
    expect(prompts[1]).toBe('Ajuste a seção de riscos.');
    expect(prompts[2]).toBe('Corrija o erro de digitação no plano.');
  });

  it('transcrição inexistente → erro', () => {
    expect(() => readTranscript(FIXTURES, 'nao-existe')).toThrow(/não encontrada/);
  });
});

describe('transcriptDir e activeSessionId', () => {
  it('deriva o slug e encontra o diretório sem diferenciar maiúsculas', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
    tmp = home;
    const dir = path.join(home, '.claude', 'projects', 'c--Projeto-TCC-final-my-project');
    fs.mkdirSync(dir, { recursive: true });
    expect(transcriptDir(String.raw`C:\Projeto_TCC_final\my-project`, home)).toBe(dir);
    expect(() => transcriptDir(String.raw`C:\outro`, home)).toThrow(/não encontrado/);
  });

  it('a sessão ativa é o .jsonl modificado mais recentemente', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
    tmp = dir;
    const files = { antiga: new Date('2026-01-01'), nova: new Date('2026-06-01') };
    for (const [name, date] of Object.entries(files)) {
      const file = path.join(dir, `${name}.jsonl`);
      fs.writeFileSync(file, '');
      fs.utimesSync(file, date, date);
    }
    fs.writeFileSync(path.join(dir, 'outro.txt'), '');
    expect(activeSessionId(dir)).toBe('nova');
  });
});
