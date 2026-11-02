import { spawn } from 'node:child_process';

export type RunOptions = {
  env?: Record<string, string>;
  capture?: boolean;
};

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type Exec = (cmd: string, args: string[], opts?: RunOptions) => Promise<RunResult>;

const WINDOWS = process.platform === 'win32';

// Com shell: true o Node junta os argumentos sem aspas; no cmd.exe, espaço e alguns símbolos
// quebrariam o argumento em vários.
export function quoteForCmd(arg: string): string {
  return /[\s"&|<>^()%!,;=]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg;
}

export const run: Exec = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const capture = opts.capture === true;
    const [file, fileArgs] = WINDOWS
      ? [[cmd, ...args.map(quoteForCmd)].join(' '), []]
      : [cmd, args];
    const child = spawn(file, fileArgs, {
      shell: WINDOWS,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env, ...opts.env, NEXT_TELEMETRY_DISABLED: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error: Error) => {
      resolve({ code: 127, stdout, stderr: stderr + error.message });
    });
    child.on('close', (code: number | null) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
