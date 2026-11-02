export type ScopeCheck = { ok: boolean; offenders: string[] };

const FORBIDDEN_SEGMENTS = new Set([
  'node_modules',
  'tests',
  '.next',
  'out',
  'coverage',
  '.scannerwork',
  'specs',
  '.specify',
  'docs',
]);

function normalize(file: string): string {
  return file.replaceAll('\\', '/');
}

function isForbidden(file: string): boolean {
  const segments = file.split('/');
  const name = segments.at(-1) ?? '';
  return (
    segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment)) ||
    name.includes('.test.') ||
    name.includes('.spec.')
  );
}

function scopeOffenders(files: readonly string[], prefix: string, label: string): string[] {
  if (files.length === 0) {
    return [`(escopo ${label} sem nenhum arquivo analisado)`];
  }
  return files
    .filter((file) => !file.startsWith(prefix) || isForbidden(file))
    .map((file) => `${label}: ${file}`);
}

export function checkScopes(
  appFiles: readonly string[],
  scriptsFiles: readonly string[],
): ScopeCheck {
  const app = appFiles.map(normalize);
  const scripts = scriptsFiles.map(normalize);
  const scriptsSet = new Set(scripts);
  const shared = app.filter((file) => scriptsSet.has(file)).map((file) => `app e scripts: ${file}`);
  const offenders = [
    ...scopeOffenders(app, 'src/', 'app'),
    ...scopeOffenders(scripts, 'scripts/', 'scripts'),
    ...shared,
  ];
  return { ok: offenders.length === 0, offenders };
}
