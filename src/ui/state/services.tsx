'use client';

// Serviços do navegador injetáveis nos componentes (som, voz, sorteio, vibração, relógio).

import { createContext, useContext, type ReactNode } from 'react';
import { systemClock, type Clock } from '../../platform/clock';
import { random, type RandomSource } from '../../platform/random';
import { getSoundService, type SoundService } from '../../platform/sound';
import { speech, type Speech } from '../../platform/speech';
import { vibrate } from '../../platform/vibration';

export type Services = {
  sound: SoundService;
  speech: Speech;
  random: RandomSource;
  vibrate: (ms: number) => void;
  clock: Clock;
};

const lazySound: SoundService = {
  play: (type, options) => getSoundService().play(type, options),
};

export const browserServices: Services = {
  sound: lazySound,
  speech,
  random,
  vibrate,
  clock: systemClock,
};

const ServicesContext = createContext<Services>(browserServices);

export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  return useContext(ServicesContext);
}
