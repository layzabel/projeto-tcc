import fs from 'node:fs';
import path from 'node:path';

export type FeatureInput = {
  feature?: string;
  env: Record<string, string | undefined>;
  cwd: string;
};

export class FeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureError';
  }
}

function latestFeature(specsDir: string): string {
  const dirs = fs.existsSync(specsDir)
    ? fs
        .readdirSync(specsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d+-/.test(entry.name))
        .map((entry) => entry.name)
    : [];
  if (dirs.length === 0) {
    throw new FeatureError(`nenhuma feature encontrada em ${specsDir}`);
  }
  dirs.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
  return dirs[0] as string;
}

export function resolveFeatureDir({ feature, env, cwd }: FeatureInput): string {
  const specsDir = path.join(cwd, 'specs');
  const name = feature || env.SPECIFY_FEATURE || latestFeature(specsDir);
  const dir = path.join(specsDir, path.basename(name));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new FeatureError(`feature não encontrada: specs/${path.basename(name)}`);
  }
  return dir;
}

export function metricsFilePath(featureDir: string): string {
  return path.join(featureDir, 'metricas-ia.md');
}
