// Sons sintetizados pela Web Audio API, sem arquivos (R10). Sons obrigatórios tocam sempre
// (FR-037) e esperam numa fila até o navegador liberar o áudio.

export type SoundType =
  | 'falta-pouco'
  | 'fim-de-tempo'
  | 'acerto'
  | 'reacao'
  | 'risada'
  | 'bocejo'
  | 'flores'
  | 'respira'
  | 'luz'
  | 'dormir';

export type AudioContextLike = {
  state: AudioContextState | string;
  currentTime: number;
  destination: unknown;
  resume: () => Promise<void>;
  createOscillator: () => OscillatorNode;
  createGain: () => GainNode;
};

export type PlayOptions = { sounds: boolean; signal?: AbortSignal };

export type SoundService = { play: (type: SoundType, options: PlayOptions) => void };

export type SoundDeps = {
  createContext: () => AudioContextLike | null;
  target: Pick<EventTarget, 'addEventListener'>;
  notify?: (type: SoundType) => void;
};

/** [frequência em Hz, início em s, duração em s]. */
type Note = readonly [number, number, number];

const MANDATORY: ReadonlySet<SoundType> = new Set(['falta-pouco', 'fim-de-tempo']);

const NOTES: Readonly<Record<SoundType, readonly Note[]>> = {
  'falta-pouco': [
    [659, 0, 0.35],
    [523, 0.4, 0.5],
  ],
  'fim-de-tempo': [
    [784, 0, 0.4],
    [659, 0.45, 0.4],
    [523, 0.9, 0.7],
  ],
  acerto: [
    [523, 0, 0.15],
    [784, 0.15, 0.25],
  ],
  reacao: [[587, 0, 0.3]],
  risada: [
    [880, 0, 0.12],
    [988, 0.18, 0.12],
    [880, 0.36, 0.12],
  ],
  bocejo: [[392, 0, 1.2]],
  flores: [
    [523, 0, 0.2],
    [659, 0.2, 0.2],
    [784, 0.4, 0.3],
  ],
  respira: [[330, 0, 1.5]],
  luz: [[440, 0, 1]],
  dormir: [
    [392, 0, 0.6],
    [330, 0.6, 1],
  ],
};

export function isMandatory(type: SoundType): boolean {
  return MANDATORY.has(type);
}

function synthesize(ctx: AudioContextLike, type: SoundType, signal?: AbortSignal): void {
  const t0 = ctx.currentTime;
  for (const [freq, start, duration] of NOTES[type]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0 + start);
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.linearRampToValueAtTime(0.25, t0 + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination as AudioNode);
    osc.start(t0 + start);
    osc.stop(t0 + start + duration + 0.05);
    signal?.addEventListener('abort', () => osc.stop(), { once: true });
  }
}

export function createSoundService(deps: SoundDeps): SoundService {
  let ctx: AudioContextLike | null = null;
  let unlocked = false;
  const queue = new Map<SoundType, AbortSignal | undefined>();

  const ensure = (): AudioContextLike | null => {
    ctx ??= deps.createContext();
    return ctx;
  };

  const emit = (type: SoundType, signal?: AbortSignal): void => {
    if (signal?.aborted || !ctx) {
      return;
    }
    synthesize(ctx, type, signal);
    deps.notify?.(type);
  };

  const flush = (): void => {
    for (const [type, signal] of queue) {
      emit(type, signal);
    }
    queue.clear();
  };

  const unlock = (): void => {
    if (unlocked) {
      return;
    }
    const context = ensure();
    if (!context) {
      return;
    }
    unlocked = true;
    void context.resume().then(flush, () => undefined);
  };

  deps.target.addEventListener('pointerdown', unlock);
  deps.target.addEventListener('keydown', unlock);

  return {
    play(type, { sounds, signal }) {
      if (signal?.aborted || (!sounds && !isMandatory(type))) {
        return;
      }
      const context = ensure();
      if (context?.state === 'running') {
        emit(type, signal);
      } else if (context && isMandatory(type)) {
        queue.set(type, signal);
      }
    },
  };
}

function browserContext(): AudioContextLike | null {
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  return Ctor ? (new Ctor() as AudioContextLike) : null;
}

let shared: SoundService | null = null;

/** Serviço único do navegador; avisa cada som tocado com o evento "tcc:som" (usado nos testes E2E). */
export function getSoundService(): SoundService {
  shared ??= createSoundService({
    createContext: browserContext,
    target: window,
    notify: (type) => window.dispatchEvent(new CustomEvent('tcc:som', { detail: type })),
  });
  return shared;
}
