import { test as base, expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';

export { expect };

export const ORIGEM = 'http://127.0.0.1:4310';
export const CHAVE = 'tcc-cp:v1';

/** Dia e hora base de todos os testes com relógio (fuso America/Sao_Paulo, sem horário de verão). */
export const DATA_BASE = '2026-11-02';
export const HORA_BASE = new Date('2026-11-02T10:00:00-03:00');

/** Senha usada nos documentos preparados. */
export const SENHA = '1234';

function credencialDe(pin: string) {
  const salt = Buffer.from('e2e-sal-fixo-16b');
  const hash = crypto.pbkdf2Sync(pin, salt, 210_000, 32, 'sha256');
  return {
    algorithm: 'PBKDF2-SHA-256',
    iterations: 210_000,
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
  };
}

export const CREDENCIAL = credencialDe(SENHA);

export type DocParcial = {
  profile?: { nickname: string | null };
  settings?: Record<string, unknown>;
  currentDay?: Record<string, unknown>;
  history?: Record<string, unknown>[];
};

/** Documento completo e válido conforme contracts/storage-schema.md. */
export function documentoValido(parcial: DocParcial = {}) {
  return {
    schemaVersion: 1,
    consent: { acceptedAt: '2026-11-01T19:02:11.123-03:00', textVersion: '1.0' },
    setupCompleted: true,
    profile: parcial.profile ?? { nickname: 'Lia' },
    settings: {
      dailyLimitMin: 60,
      warningMin: 5,
      closureStyle: 'respiracao',
      sounds: true,
      voice: true,
      reducedMotion: false,
      ...parcial.settings,
    },
    credential: CREDENCIAL,
    currentDay: {
      date: DATA_BASE,
      usedSeconds: 0,
      limitMin: 60,
      warningPlayed: false,
      supervisionInviteShown: true,
      closure: 'nao-iniciado',
      closureRequestedByAdult: false,
      ...parcial.currentDay,
    },
    history: parcial.history ?? [],
  };
}

type Fixtures = {
  semRedeExterna: void;
  estadoVazio: () => Promise<void>;
  comDocumento: (doc: unknown) => Promise<void>;
  relogio: (time?: Date) => Promise<void>;
  falas: { lista: () => Promise<string[]> };
  sons: { lista: () => Promise<string[]> };
  fixarSorteio: (valores: number[]) => Promise<void>;
};

/** Substitui a voz do sistema por um registrador com uma voz local pt-BR. */
function instalarRegistradorDeFalas(): void {
  const registro: string[] = [];
  const voz = { lang: 'pt-BR', localService: true, name: 'e2e', voiceURI: 'e2e', default: true };
  class Utterance {
    text: string;
    lang = '';
    voice: unknown = null;
    rate = 1;
    pitch = 1;
    volume = 1;
    onend: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
    addEventListener(): void {}
  }
  const sintese = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [voz],
    speak: (u: Utterance) => {
      registro.push(u.text);
    },
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    onvoiceschanged: null,
  };
  Object.defineProperty(window, 'speechSynthesis', { value: sintese, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: Utterance,
    configurable: true,
  });
  Object.defineProperty(window, '__falas', { value: registro, configurable: true });
}

/** Registra os sons pedidos (evento tcc:som do serviço de som) e mantém o áudio "desbloqueado". */
function instalarRegistradorDeSons(): void {
  const registro: string[] = [];
  window.addEventListener('tcc:som', (e) => {
    registro.push(String((e as CustomEvent).detail));
  });
  Object.defineProperty(window, '__sons', { value: registro, configurable: true });
}

function instalarSorteio(valores: number[]): void {
  const original = crypto.getRandomValues.bind(crypto);
  let i = 0;
  crypto.getRandomValues = (<T extends ArrayBufferView | null>(array: T): T => {
    if (array instanceof Uint32Array && array.length === 1) {
      const v = valores[i % valores.length] ?? 0;
      i += 1;
      array[0] = Math.floor(v * 2 ** 32);
      return array;
    }
    return original(array as never) as T;
  }) as typeof crypto.getRandomValues;
}

export const test = base.extend<Fixtures>({
  semRedeExterna: [
    async ({ context }, usar, testInfo) => {
      const externas: string[] = [];
      context.on('request', (req) => {
        const url = req.url();
        if (!url.startsWith(`${ORIGEM}/`) && !url.startsWith('blob:') && !url.startsWith('data:')) {
          externas.push(url);
        }
      });
      await usar();
      if (externas.length > 0) {
        testInfo.annotations.push({ type: 'rede-externa', description: externas.join('\n') });
      }
      expect(externas, 'requisições para fora da origem (SC-011)').toEqual([]);
    },
    { auto: true },
  ],

  estadoVazio: async ({ page }, usar) => {
    await usar(async () => {
      await page.addInitScript(() => {
        if (sessionStorage.getItem('e2e-limpo') === null) {
          localStorage.clear();
          sessionStorage.setItem('e2e-limpo', '1');
        }
      });
    });
  },

  comDocumento: async ({ page }, usar) => {
    await usar(async (doc) => {
      await page.addInitScript(
        ([chave, texto]) => {
          if (sessionStorage.getItem('e2e-doc') === null) {
            localStorage.setItem(chave, texto);
            sessionStorage.setItem('e2e-doc', '1');
          }
        },
        [CHAVE, JSON.stringify(doc)] as const,
      );
    });
  },

  // Relógio parado no instante dado: o tempo só anda com runFor/fastForward/setSystemTime.
  relogio: async ({ page }, usar) => {
    await usar(async (time = HORA_BASE) => {
      await page.clock.install({ time: time.getTime() - 1000 });
      await page.clock.pauseAt(time);
    });
  },

  falas: async ({ page }, usar) => {
    await page.addInitScript(instalarRegistradorDeFalas);
    await usar({
      lista: () => page.evaluate(() => [...(window as unknown as { __falas: string[] }).__falas]),
    });
  },

  sons: async ({ page }, usar) => {
    await page.addInitScript(instalarRegistradorDeSons);
    await usar({
      lista: () => page.evaluate(() => [...(window as unknown as { __sons: string[] }).__sons]),
    });
  },

  fixarSorteio: async ({ page }, usar) => {
    await usar(async (valores) => {
      await page.addInitScript(instalarSorteio, valores);
    });
  },
});

/** Lê o documento gravado no aparelho. */
export async function lerDocumento(page: Page): Promise<Record<string, unknown> | null> {
  const texto = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE);
  return texto === null ? null : (JSON.parse(texto) as Record<string, unknown>);
}

/** Lê o dia atual gravado. */
export async function lerDia(page: Page): Promise<Record<string, unknown>> {
  const doc = await lerDocumento(page);
  return (doc?.currentDay ?? {}) as Record<string, unknown>;
}

/** Segura o botão "sou o adulto" por 3 s com o relógio controlado. */
export async function segurarBotaoAdulto(page: Page, ms = 3100): Promise<void> {
  const botao = page.getByRole('button', { name: 'Sou o adulto: segure por 3 segundos' });
  await botao.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true });
  await page.clock.runFor(ms);
  // segurar 3 s abre a área do adulto, que substitui a tela e o botão
  if ((await botao.count()) > 0) {
    await botao.dispatchEvent('pointerup', { pointerId: 1, isPrimary: true });
  }
}

/** Digita a senha no teclado numérico próprio. */
export async function digitarSenha(page: Page, pin: string): Promise<void> {
  for (const d of pin) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
}

/** Data local AAAA-MM-DD somando dias a DATA_BASE. */
export function diaRelativo(dias: number): string {
  const d = new Date(`${DATA_BASE}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Alertas da aplicação, sem o anunciador de rotas que o Next.js injeta na página. */
export function alerta(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/** Simula a aplicação indo para segundo plano (ou voltando) com o evento visibilitychange. */
export async function definirVisibilidade(page: Page, visivel: boolean): Promise<void> {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', {
      value: v ? 'visible' : 'hidden',
      configurable: true,
    });
    Object.defineProperty(document, 'hidden', { value: !v, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, visivel);
}

/** Tempo usado gravado no aparelho, em segundos. */
export async function segundosUsados(page: Page): Promise<number> {
  return Number((await lerDia(page)).usedSeconds);
}
