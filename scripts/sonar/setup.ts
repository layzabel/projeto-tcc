import {
  SonarApiError,
  asArray,
  asObject,
  asString,
  createSonarApi,
  hostUrl,
  type FetchLike,
  type SonarApi,
} from './api.ts';

export const PROFILE = 'TCC TypeScript';
export const GATE = 'TCC';
export const LANGUAGE = 'ts';
export const PROJECTS = [
  { key: 'tcc-controle-parental-app', name: 'TCC Controle Parental — app' },
  { key: 'tcc-controle-parental-scripts', name: 'TCC Controle Parental — scripts' },
] as const;

export const RULES = [
  { rule: 'typescript:S3776', threshold: '15' },
  { rule: 'typescript:S1541', threshold: '10' },
] as const;

export const CONDITIONS = [
  { metric: 'bugs', op: 'GT', error: '0' },
  { metric: 'vulnerabilities', op: 'GT', error: '0' },
  { metric: 'security_hotspots_reviewed', op: 'LT', error: '100' },
  { metric: 'duplicated_lines_density', op: 'GT', error: '3' },
  { metric: 'sqale_rating', op: 'GT', error: '1' },
  { metric: 'blocker_violations', op: 'GT', error: '0' },
  { metric: 'critical_violations', op: 'GT', error: '0' },
] as const;

const MODE_KEY = 'sonar.multi-quality-mode.enabled';

type Log = { log: (m: string) => void; error: (m: string) => void };

export class SetupError extends Error {}

async function standardExperience(api: SonarApi, log: Log): Promise<void> {
  // Desde o SonarQube 2025.x, api/settings/set recusa esta chave; a troca de modo é pela API v2.
  await api.patchJson('api/v2/clean-code-policy/mode', { mode: 'STANDARD_EXPERIENCE' });
  const data = await api.get('api/settings/values', { keys: MODE_KEY });
  const value = asString(asArray(data.settings).find((s) => s.key === MODE_KEY)?.value);
  if (value !== 'false') {
    throw new SetupError(
      `não foi possível ativar o modo Standard Experience (${MODE_KEY} = "${value}")`,
    );
  }
  log.log('Modo Standard Experience: ativo');
}

async function ensureProfile(api: SonarApi, log: Log): Promise<string> {
  const search = await api.get('api/qualityprofiles/search', { language: LANGUAGE });
  const existing = asArray(search.profiles).find((p) => p.name === PROFILE);
  let key = asString(existing?.key);
  if (!existing) {
    const created = await api.post('api/qualityprofiles/create', {
      name: PROFILE,
      language: LANGUAGE,
    });
    key = asString(asObject(created.profile).key);
    log.log(`Perfil "${PROFILE}" criado`);
  }
  await api.post('api/qualityprofiles/change_parent', {
    language: LANGUAGE,
    qualityProfile: PROFILE,
    parentQualityProfile: 'Sonar way',
  });
  for (const { rule, threshold } of RULES) {
    const show = await api.get('api/rules/show', { key: rule });
    const params = asArray(asObject(show.rule).params).map((p) => asString(p.key));
    const param = params.find((p) => p.toLowerCase() === 'threshold') ?? 'threshold';
    await api.post('api/qualityprofiles/activate_rule', {
      key,
      rule,
      severity: 'CRITICAL',
      params: `${param}=${threshold}`,
    });
  }
  log.log(`Perfil "${PROFILE}": herda de "Sonar way"; S3776=15 e S1541=10 (Critical)`);
  return key;
}

async function showGate(api: SonarApi) {
  try {
    return await api.get('api/qualitygates/show', { name: GATE });
  } catch (error) {
    if (error instanceof SonarApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

async function ensureGate(api: SonarApi, log: Log): Promise<void> {
  let gate = await showGate(api);
  if (!gate) {
    await api.post('api/qualitygates/create', { name: GATE });
    log.log(`Quality Gate "${GATE}" criado`);
    gate = await api.get('api/qualitygates/show', { name: GATE });
  }
  const current = asArray(gate.conditions);
  // Gates novos já vêm com condições padrão de New Code; só ficam as do contrato.
  const wanted = new Set<string>(CONDITIONS.map((c) => c.metric));
  for (const extra of current.filter((c) => !wanted.has(asString(c.metric)))) {
    await api.post('api/qualitygates/delete_condition', { id: asString(extra.id) });
    log.log(
      `Quality Gate "${GATE}": condição fora do contrato removida (${asString(extra.metric)})`,
    );
  }
  for (const condition of CONDITIONS) {
    const found = current.find((c) => c.metric === condition.metric);
    if (!found) {
      await api.post('api/qualitygates/create_condition', { gateName: GATE, ...condition });
    } else if (asString(found.op) !== condition.op || asString(found.error) !== condition.error) {
      await api.post('api/qualitygates/update_condition', {
        id: asString(found.id),
        ...condition,
      });
    }
  }
  log.log(`Quality Gate "${GATE}": ${CONDITIONS.length} condições em Overall Code`);
}

async function ensureProjects(api: SonarApi, log: Log): Promise<void> {
  for (const project of PROJECTS) {
    const search = await api.get('api/projects/search', { projects: project.key });
    if (asArray(search.components).length === 0) {
      await api.post('api/projects/create', { project: project.key, name: project.name });
      log.log(`Projeto ${project.key} criado`);
    }
    await api.post('api/qualityprofiles/add_project', {
      language: LANGUAGE,
      qualityProfile: PROFILE,
      project: project.key,
    });
    await api.post('api/qualitygates/select', { gateName: GATE, projectKey: project.key });
    log.log(`Projeto ${project.key}: perfil "${PROFILE}" e gate "${GATE}" associados`);
  }
}

export async function setup(deps: {
  env: Record<string, string | undefined>;
  fetch: FetchLike;
  log: Log;
}): Promise<number> {
  const { env, log } = deps;
  log.log(`SONAR_TOKEN definido: ${env.SONAR_TOKEN ? 'sim' : 'não'}`);
  if (!env.SONAR_TOKEN) {
    log.error('SONAR:SETUP FALHOU: SONAR_TOKEN (de administrador) não definido');
    return 1;
  }
  const api = createSonarApi({ baseUrl: hostUrl(env), token: env.SONAR_TOKEN, fetch: deps.fetch });
  try {
    await standardExperience(api, log);
    await ensureProfile(api, log);
    await ensureGate(api, log);
    await ensureProjects(api, log);
    log.log('SONAR:SETUP OK');
    return 0;
  } catch (error) {
    log.error(`SONAR:SETUP FALHOU: ${(error as Error).message}`);
    return 1;
  }
}

if (import.meta.main) {
  process.exit(await setup({ env: process.env, fetch, log: console }));
}
