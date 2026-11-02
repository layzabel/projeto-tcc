// Voz do mascote só com vozes locais em português (R11): o texto, inclusive o nome da criança,
// não sai do aparelho.

export type VoiceLike = { lang: string; localService: boolean; name: string };

type SynthLike = {
  getVoices: () => VoiceLike[];
  speak: (utterance: SpeechSynthesisUtterance) => void;
  cancel: () => void;
};

export type SpeechEnv = {
  synth: SynthLike;
  Utterance: new (text: string) => SpeechSynthesisUtterance;
} | null;

export type SpeakOptions = { voice: boolean; signal?: AbortSignal };

export type Speech = {
  speak: (text: string, options: SpeakOptions) => boolean;
  cancelSpeech: () => void;
};

export function pickVoice(voices: readonly VoiceLike[]): VoiceLike | null {
  const eligible = voices.filter((v) => v.localService && v.lang.toLowerCase().startsWith('pt'));
  return (
    eligible.find((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br') ?? eligible[0] ?? null
  );
}

export function createSpeech(getEnv: () => SpeechEnv): Speech {
  const cancelSpeech = (): void => {
    getEnv()?.synth.cancel();
  };
  return {
    speak(text, { voice, signal }) {
      const env = getEnv();
      if (!env || !voice || signal?.aborted) {
        return false;
      }
      const chosen = pickVoice(env.synth.getVoices());
      if (!chosen) {
        return false;
      }
      env.synth.cancel();
      const utterance = new env.Utterance(text);
      utterance.voice = chosen as SpeechSynthesisVoice;
      utterance.lang = chosen.lang;
      env.synth.speak(utterance);
      signal?.addEventListener('abort', cancelSpeech, { once: true });
      return true;
    },
    cancelSpeech,
  };
}

function browserEnv(): SpeechEnv {
  if (
    typeof window === 'undefined' ||
    !window.speechSynthesis ||
    !window.SpeechSynthesisUtterance
  ) {
    return null;
  }
  return { synth: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance };
}

export const speech: Speech = createSpeech(browserEnv);
