import { describe, expect, it, vi } from 'vitest';
import { createSoundService, isMandatory, type AudioContextLike } from '@/platform/sound';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeContext implements AudioContextLike {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  createOscillator() {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc as unknown as OscillatorNode;
  }
  createGain() {
    return new FakeGain() as unknown as GainNode;
  }
}

function setup(state: AudioContextState = 'suspended') {
  const contexts: FakeContext[] = [];
  const target = new EventTarget();
  const played: string[] = [];
  const service = createSoundService({
    createContext: () => {
      const ctx = new FakeContext();
      ctx.state = state;
      contexts.push(ctx);
      return ctx;
    },
    target,
    notify: (type) => played.push(type),
  });
  const unlock = async () => {
    target.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
  };
  return { contexts, target, played, service, unlock };
}

describe('classificação obrigatório × efeito (FR-037)', () => {
  it('falta-pouco e fim-de-tempo são obrigatórios; o resto é efeito', () => {
    expect(isMandatory('falta-pouco')).toBe(true);
    expect(isMandatory('fim-de-tempo')).toBe(true);
    for (const t of ['acerto', 'reacao', 'risada', 'bocejo', 'flores', 'respira'] as const) {
      expect(isMandatory(t)).toBe(false);
    }
  });
});

describe('sound service (R10)', () => {
  it('cria um único contexto e o retoma no primeiro pointerdown', async () => {
    const { contexts, unlock, service } = setup();
    await unlock();
    await unlock();
    service.play('acerto', { sounds: true });
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.resume).toHaveBeenCalledTimes(1);
  });

  it('sons obrigatórios tocam mesmo com sounds = false', async () => {
    const { played, service, unlock } = setup();
    await unlock();
    service.play('falta-pouco', { sounds: false });
    service.play('fim-de-tempo', { sounds: false });
    expect(played).toEqual(['falta-pouco', 'fim-de-tempo']);
  });

  it('sons de efeito ficam em silêncio com sounds = false', async () => {
    const { played, service, unlock, contexts } = setup();
    await unlock();
    for (const t of ['acerto', 'reacao', 'risada', 'bocejo', 'flores', 'respira'] as const) {
      service.play(t, { sounds: false });
    }
    expect(played).toEqual([]);
    expect(contexts[0]!.oscillators).toHaveLength(0);
    service.play('acerto', { sounds: true });
    expect(played).toEqual(['acerto']);
    expect(contexts[0]!.oscillators.length).toBeGreaterThan(0);
  });

  it('obrigatórios antes do desbloqueio ficam na fila, no máximo um por tipo', async () => {
    const { played, service, unlock } = setup();
    service.play('falta-pouco', { sounds: true });
    service.play('falta-pouco', { sounds: true });
    service.play('fim-de-tempo', { sounds: false });
    service.play('acerto', { sounds: true });
    expect(played).toEqual([]);
    await unlock();
    expect(played).toEqual(['falta-pouco', 'fim-de-tempo']);
  });

  it('contexto já em execução toca na hora', () => {
    const { played, service } = setup('running');
    service.play('acerto', { sounds: true });
    expect(played).toEqual(['acerto']);
  });

  it('AbortSignal abortado impede o som, inclusive na fila', async () => {
    const { played, service, unlock } = setup();
    const controller = new AbortController();
    service.play('fim-de-tempo', { sounds: true, signal: controller.signal });
    controller.abort();
    await unlock();
    service.play('falta-pouco', { sounds: true, signal: controller.signal });
    expect(played).toEqual([]);
  });

  it('abortar durante o som para os osciladores', () => {
    const { service, contexts } = setup('running');
    const controller = new AbortController();
    service.play('fim-de-tempo', { sounds: true, signal: controller.signal });
    const oscillators = contexts[0]!.oscillators;
    const before = oscillators.map((o) => o.stop.mock.calls.length);
    controller.abort();
    oscillators.forEach((o, i) => expect(o.stop.mock.calls.length).toBeGreaterThan(before[i]!));
  });

  it('sem Web Audio não falha', () => {
    const service = createSoundService({ createContext: () => null, target: new EventTarget() });
    expect(() => service.play('fim-de-tempo', { sounds: true })).not.toThrow();
  });
});
