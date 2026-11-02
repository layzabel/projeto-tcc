import { setTimeout as sleep } from 'node:timers/promises';
import { run, type Exec } from '../lib/exec.ts';
import { createSonarApi, hostUrl, type FetchLike } from './api.ts';

export type UpDeps = {
  env: Record<string, string | undefined>;
  exec: Exec;
  fetch: FetchLike;
  sleep: (ms: number) => Promise<unknown>;
  now: () => number;
  log: { log: (m: string) => void; error: (m: string) => void };
};

const INTERVAL_MS = 5_000;
const TIMEOUT_MS = 5 * 60_000;

export async function up(deps: UpDeps): Promise<number> {
  const result = await deps.exec('docker', ['compose', 'up', '-d', 'sonarqube']);
  if (result.code !== 0) {
    deps.log.error('SONAR:UP FALHOU: Docker indisponível ou "docker compose up" falhou');
    return 1;
  }
  const url = hostUrl(deps.env);
  const api = createSonarApi({ baseUrl: url, fetch: deps.fetch });
  const deadline = deps.now() + TIMEOUT_MS;
  while (deps.now() < deadline) {
    const status = await api.systemStatus().catch(() => 'INDISPONIVEL');
    deps.log.log(`SonarQube em ${url}: ${status}`);
    if (status === 'UP') {
      deps.log.log('SONAR:UP OK');
      return 0;
    }
    await deps.sleep(INTERVAL_MS);
  }
  deps.log.error(`SONAR:UP FALHOU: servidor não ficou UP em 5 min (${url})`);
  return 1;
}

if (import.meta.main) {
  process.exit(
    await up({ env: process.env, exec: run, fetch, sleep, now: Date.now, log: console }),
  );
}
