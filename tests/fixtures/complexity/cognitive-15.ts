// Cognitiva = 1 + 2 + 3 + 4 + 5 = 15 (limite: não sinaliza).
// Ciclomática = 1 + 5 pontos de decisão = 6.
// Cada if soma 1 mais o nível de aninhamento.
export function cognitive15(a: number, b: number, c: number, d: number, e: number): number {
  let r = 0;
  if (a > 0) {
    // if no nível 0: cognitiva +1
    if (b > 0) {
      // if no nível 1: cognitiva +2
      if (c > 0) {
        // if no nível 2: cognitiva +3
        if (d > 0) {
          // if no nível 3: cognitiva +4
          if (e > 0) {
            // if no nível 4: cognitiva +5
            r = 1;
          }
        }
      }
    }
  }
  return r;
}
