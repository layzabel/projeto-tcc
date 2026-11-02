import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Exec } from '../../scripts/lib/exec.ts';

export const SESSION_OK = fs.readFileSync(
  path.resolve('tests/fixtures/ccusage/session-ok.json'),
  'utf8',
);
export const TRANSCRIPT_A = fs.readFileSync(
  path.resolve('tests/fixtures/transcripts/session-a.jsonl'),
  'utf8',
);

/** Saída de `ccusage session --json --id <id>` com o ID e o custo trocados. */
export function ccusageOutput(id: string, cost = '0.30000000000000004'): string {
  return SESSION_OK.replace('11111111-1111-4111-8111-111111111111', id).replace(
    '"totalCost": 0.30000000000000004',
    `"totalCost": ${cost}`,
  );
}

export type FakeCcusage = { exec: Exec; calls: string[][] };

/** ccusage simulado: `sessions` mapeia ID → saída JSON; ID ausente → "null". */
export function fakeCcusage(sessions: Record<string, string>, code = 0): FakeCcusage {
  const calls: string[][] = [];
  const exec: Exec = async (cmd, args) => {
    calls.push([cmd, ...args]);
    const id = args[args.indexOf('--id') + 1] ?? '';
    return { code, stdout: sessions[id] ?? 'null', stderr: '' };
  };
  return { exec, calls };
}

export type Workspace = { cwd: string; home: string; transcripts: string; feature: string };

export function createWorkspace(feature = '001-teste'): Workspace {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
  const cwd = path.join(root, 'repo');
  const home = path.join(root, 'home');
  fs.mkdirSync(path.join(cwd, 'specs', feature), { recursive: true });
  const slug = cwd.replaceAll(/[^A-Za-z0-9]/g, '-');
  const transcripts = path.join(home, '.claude', 'projects', slug);
  fs.mkdirSync(transcripts, { recursive: true });
  return { cwd, home, transcripts, feature: path.join(cwd, 'specs', feature) };
}

export function addTranscript(
  ws: Workspace,
  id: string,
  mtime: Date,
  content = TRANSCRIPT_A,
): void {
  const file = path.join(ws.transcripts, `${id}.jsonl`);
  fs.writeFileSync(file, content);
  fs.utimesSync(file, mtime, mtime);
}

export function removeWorkspace(ws: Workspace): void {
  fs.rmSync(path.dirname(ws.cwd), { recursive: true, force: true });
}
