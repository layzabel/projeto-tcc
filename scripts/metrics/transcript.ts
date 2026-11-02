import fs from 'node:fs';
import path from 'node:path';

export class TranscriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptError';
  }
}

type Entry = Record<string, unknown>;

// Comandos internos do Claude Code: rodam localmente e não são mensagens enviadas ao agente.
const LOCAL_COMMANDS = new Set([
  '/add-dir',
  '/agents',
  '/clear',
  '/compact',
  '/config',
  '/context',
  '/cost',
  '/doctor',
  '/effort',
  '/exit',
  '/export',
  '/fast',
  '/help',
  '/hooks',
  '/ide',
  '/login',
  '/logout',
  '/mcp',
  '/memory',
  '/model',
  '/permissions',
  '/plugin',
  '/resume',
  '/rewind',
  '/status',
  '/statusline',
  '/theme',
  '/usage',
]);

// Prefixos de texto gerado pelo próprio Claude Code dentro de entradas `type: "user"`.
const SYNTHETIC_PREFIXES = [
  '<local-command-stdout>',
  '<local-command-stderr>',
  '<local-command-caveat>',
  '<bash-input>',
  '<bash-stdout>',
  '<bash-stderr>',
  '<task-notification>',
  '<system-reminder>',
  '[Request interrupted by user',
];

export function transcriptDir(cwd: string, home: string): string {
  const slug = cwd.replaceAll(/[^A-Za-z0-9]/g, '-');
  const projects = path.join(home, '.claude', 'projects');
  const entries = fs.existsSync(projects) ? fs.readdirSync(projects) : [];
  const found = entries.find((name) => name.toLowerCase() === slug.toLowerCase());
  if (!found) {
    throw new TranscriptError(`diretório de transcrições não encontrado para ${slug}`);
  }
  return path.join(projects, found);
}

export function readTranscript(dir: string, id: string): Entry[] {
  const file = path.join(dir, `${id}.jsonl`);
  if (!fs.existsSync(file)) {
    throw new TranscriptError(`transcrição da sessão ${id} não encontrada`);
  }
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Entry);
}

function textOf(content: unknown): string | undefined {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return undefined;
  }
  const parts = content as Array<{ type?: unknown; text?: unknown }>;
  if (parts.some((part) => part.type === 'tool_result')) {
    return undefined;
  }
  const texts = parts.filter((p) => p.type === 'text').map((p) => String(p.text ?? ''));
  return texts.length > 0 ? texts.join('\n') : undefined;
}

function isLocalCommand(text: string): boolean {
  const name = /<command-name>([^<]*)<\/command-name>/.exec(text)?.[1]?.trim();
  return name !== undefined && LOCAL_COMMANDS.has(name);
}

function isGenerated(entry: Entry): boolean {
  return (
    entry.type !== 'user' ||
    entry.isMeta === true ||
    entry.isCompactSummary === true ||
    entry.isSidechain === true ||
    entry.isVisibleInTranscriptOnly === true
  );
}

function promptText(entry: Entry): string | undefined {
  if (isGenerated(entry)) {
    return undefined;
  }
  const message = entry.message as { content?: unknown } | undefined;
  const text = textOf(message?.content)?.trim();
  if (!text || SYNTHETIC_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    return undefined;
  }
  return isLocalCommand(text) ? undefined : text;
}

export function listPrompts(lines: readonly Entry[]): string[] {
  return lines.flatMap((entry) => {
    const text = promptText(entry);
    return text === undefined ? [] : [text];
  });
}

export function countPrompts(lines: readonly Entry[]): number {
  return listPrompts(lines).length;
}

export function activeSessionId(dir: string): string | undefined {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.name.slice(0, -'.jsonl'.length);
}
