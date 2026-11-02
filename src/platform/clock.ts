// Relógios injetáveis: monotônico para durações (R4) e de parede só para a data (R5).

export type Clock = {
  monotonic: () => number;
  now: () => Date;
};

export const systemClock: Clock = {
  monotonic: () => performance.now(),
  now: () => new Date(),
};
