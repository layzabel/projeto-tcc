// Ciclomática = 1 + 10 pontos de decisão = 11 (acima do limite 10: sinaliza).
// Cognitiva = 10 (nenhum aninhamento).
// Só if, for, while, && e || (contados igual pelo ESLint e pelo SonarQube — R6).
export function cyclomatic11(a: number, b: number, c: boolean, d: boolean): number {
  let r = 0;
  if (a > 0) {
    // if: ciclomática +1, cognitiva +1
    r += 1;
  }
  if (b > 0) {
    // if: ciclomática +1, cognitiva +1
    r += 1;
  }
  if (c && d) {
    // if + &&: ciclomática +2, cognitiva +2
    r += 1;
  }
  if (c || d) {
    // if + ||: ciclomática +2, cognitiva +2
    r += 1;
  }
  for (let i = 0; i < a; i++) {
    // for: ciclomática +1, cognitiva +1
    r += 1;
  }
  while (r > 100) {
    // while: ciclomática +1, cognitiva +1
    r -= 1;
  }
  if (a > b) {
    // if: ciclomática +1, cognitiva +1
    r += 1;
  }
  if (b > a) {
    // if: ciclomática +1, cognitiva +1
    r -= 1;
  }
  return r;
}
