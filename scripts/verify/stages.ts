import type { Exec } from '../lib/exec.ts';

export type Command = { cmd: string; args: string[] };

export type Stage = {
  name: 'tipos' | 'padroes' | 'testes' | 'build';
  code: 1 | 2 | 3 | 4;
  commands: Command[];
};

export type Log = {
  log: (message: string) => void;
  error: (message: string) => void;
};

export const STAGES: readonly Stage[] = [
  {
    name: 'tipos',
    code: 1,
    commands: [
      { cmd: 'npx', args: ['tsc', '--noEmit', '-p', 'tsconfig.json'] },
      { cmd: 'npx', args: ['tsc', '--noEmit', '-p', 'scripts/tsconfig.json'] },
      { cmd: 'npx', args: ['tsc', '--noEmit', '-p', 'src/pwa/tsconfig.json'] },
    ],
  },
  {
    name: 'padroes',
    code: 2,
    commands: [
      { cmd: 'npx', args: ['eslint', '.', '--max-warnings=0'] },
      { cmd: 'npx', args: ['prettier', '--check', '.'] },
    ],
  },
  {
    name: 'testes',
    code: 3,
    commands: [{ cmd: 'npx', args: ['vitest', 'run', '--coverage'] }],
  },
  {
    name: 'build',
    code: 4,
    commands: [
      { cmd: 'npx', args: ['next', 'build'] },
      { cmd: 'node', args: ['scripts/pwa/generate-sw.ts'] },
    ],
  },
];

async function runStage(stage: Stage, exec: Exec): Promise<boolean> {
  for (const command of stage.commands) {
    const result = await exec(command.cmd, command.args);
    if (result.code !== 0) {
      return false;
    }
  }
  return true;
}

export async function runStages(stages: readonly Stage[], exec: Exec, log: Log): Promise<number> {
  for (const stage of stages) {
    log.log(`VERIFY ▶ etapa=${stage.name}`);
    if (!(await runStage(stage, exec))) {
      log.error(`VERIFY FALHOU: etapa=${stage.name} (código ${stage.code})`);
      return stage.code;
    }
  }
  log.log(`VERIFY OK: ${stages.length}/${stages.length} etapas`);
  return 0;
}
