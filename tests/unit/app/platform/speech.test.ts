import { describe, expect, it, vi } from 'vitest';
import { createSpeech, pickVoice, type VoiceLike } from '@/platform/speech';

const voice = (lang: string, localService: boolean, name = lang): VoiceLike => ({
  lang,
  localService,
  name,
});

class FakeUtterance {
  voice: VoiceLike | null = null;
  lang = '';
  constructor(public text: string) {}
}

function setup(voices: VoiceLike[]) {
  const synth = {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
  };
  const speech = createSpeech(() => ({
    synth,
    Utterance: FakeUtterance as unknown as new (text: string) => SpeechSynthesisUtterance,
  }));
  return { synth, speech };
}

describe('pickVoice (R11)', () => {
  it('só aceita vozes pt locais e prefere pt-BR', () => {
    expect(pickVoice([voice('pt-PT', true), voice('pt-BR', true)])?.lang).toBe('pt-BR');
    expect(pickVoice([voice('pt-PT', true), voice('en-US', true)])?.lang).toBe('pt-PT');
    expect(pickVoice([voice('pt-BR', false), voice('en-US', true)])).toBeNull();
    expect(pickVoice([voice('pt_BR', true)])?.lang).toBe('pt_BR');
    expect(pickVoice([])).toBeNull();
  });
});

describe('speak', () => {
  it('fala com a voz local e cancela a fala anterior antes', () => {
    const { synth, speech } = setup([
      voice('pt-BR', false, 'remota'),
      voice('pt-BR', true, 'local'),
    ]);
    expect(speech.speak('Oi', { voice: true })).toBe(true);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0]![0] as FakeUtterance;
    expect(utterance.text).toBe('Oi');
    expect(utterance.voice?.name).toBe('local');
    expect(utterance.lang).toBe('pt-BR');
    expect(synth.cancel.mock.invocationCallOrder[0]!).toBeLessThan(
      synth.speak.mock.invocationCallOrder[0]!,
    );
  });

  it('sem voz elegível não fala', () => {
    const { synth, speech } = setup([voice('pt-BR', false), voice('en-US', true)]);
    expect(speech.speak('Oi', { voice: true })).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('voice = false não fala', () => {
    const { synth, speech } = setup([voice('pt-BR', true)]);
    expect(speech.speak('Oi', { voice: false })).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('signal já abortado não fala; abortar depois cancela a fala', () => {
    const { synth, speech } = setup([voice('pt-BR', true)]);
    const aborted = new AbortController();
    aborted.abort();
    expect(speech.speak('Oi', { voice: true, signal: aborted.signal })).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();

    const controller = new AbortController();
    speech.speak('Oi', { voice: true, signal: controller.signal });
    synth.cancel.mockClear();
    controller.abort();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it('cancelSpeech cancela; sem speechSynthesis nada falha', () => {
    const { synth, speech } = setup([voice('pt-BR', true)]);
    speech.cancelSpeech();
    expect(synth.cancel).toHaveBeenCalled();
    const none = createSpeech(() => null);
    expect(none.speak('Oi', { voice: true })).toBe(false);
    expect(() => none.cancelSpeech()).not.toThrow();
  });
});
