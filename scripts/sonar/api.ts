export type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type FetchLike = (
  url: string,
  init: { method: Method; headers: Record<string, string>; body?: string },
) => Promise<FetchResponse>;

export type Method = 'GET' | 'POST' | 'PATCH';

export type Params = Record<string, string>;

export type CeTask = { status: string; analysisId: string; executedAt: string };

export class SonarApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SonarApiError';
    this.status = status;
  }
}

export const DEFAULT_HOST_URL = 'http://localhost:9000';

export function hostUrl(env: Record<string, string | undefined>): string {
  let url = env.SONAR_HOST_URL || DEFAULT_HOST_URL;
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

type Json = Record<string, unknown>;

function asObject(value: unknown): Json {
  return typeof value === 'object' && value !== null ? (value as Json) : {};
}

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? value.map(asObject) : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export type SonarApi = ReturnType<typeof createSonarApi>;

export function createSonarApi(options: { baseUrl: string; token?: string; fetch: FetchLike }) {
  const headers: Record<string, string> = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : {};

  async function send(
    method: Method,
    url: string,
    extraHeaders: Record<string, string>,
    body?: string,
  ): Promise<Json> {
    const path = url.slice(options.baseUrl.length + 1).split('?')[0];
    const response = await options.fetch(url, {
      method,
      headers: { ...headers, ...extraHeaders },
      body,
    });
    const data = response.status === 204 ? {} : asObject(await response.json().catch(() => ({})));
    if (!response.ok) {
      const detail = asString(asArray(data.errors)[0]?.msg);
      throw new SonarApiError(
        `${method} ${path} respondeu HTTP ${response.status}${detail ? ': ' + detail : ''}`,
        response.status,
      );
    }
    return data;
  }

  async function call(method: 'GET' | 'POST', path: string, params: Params = {}): Promise<Json> {
    const query = new URLSearchParams(params).toString();
    if (method === 'GET') {
      return send(method, `${options.baseUrl}/${path}${query ? '?' + query : ''}`, {});
    }
    const form = { 'Content-Type': 'application/x-www-form-urlencoded' };
    return send(method, `${options.baseUrl}/${path}`, form, query);
  }

  const get = (path: string, params?: Params) => call('GET', path, params);
  const post = (path: string, params?: Params) => call('POST', path, params);
  const patchJson = (path: string, body: Json) =>
    send(
      'PATCH',
      `${options.baseUrl}/${path}`,
      { 'Content-Type': 'application/json' },
      JSON.stringify(body),
    );

  async function listFiles(key: string): Promise<string[]> {
    const files: string[] = [];
    for (let page = 1; ; page++) {
      const data = await get('api/measures/component_tree', {
        component: key,
        qualifiers: 'FIL',
        metricKeys: 'ncloc',
        ps: '500',
        p: String(page),
      });
      const components = asArray(data.components);
      files.push(...components.map((c) => asString(c.path)));
      const total = Number(asObject(data.paging).total ?? files.length);
      if (components.length === 0 || files.length >= total) {
        return files;
      }
    }
  }

  return {
    get,
    post,
    patchJson,
    listFiles,
    async systemStatus(): Promise<string> {
      return asString((await get('api/system/status')).status);
    },
    async measures(key: string, metricKeys: readonly string[]): Promise<Record<string, string>> {
      const data = await get('api/measures/component', {
        component: key,
        metricKeys: metricKeys.join(','),
      });
      const measures = asArray(asObject(data.component).measures);
      return Object.fromEntries(measures.map((m) => [asString(m.metric), asString(m.value)]));
    },
    async gateStatus(key: string): Promise<string> {
      const data = await get('api/qualitygates/project_status', { projectKey: key });
      return asString(asObject(data.projectStatus).status);
    },
    async ceTask(id: string): Promise<CeTask> {
      const task = asObject((await get('api/ce/task', { id })).task);
      return {
        status: asString(task.status),
        analysisId: asString(task.analysisId),
        executedAt: asString(task.executedAt),
      };
    },
  };
}

export { asArray, asObject, asString };
