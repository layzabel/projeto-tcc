// Vibração opcional: só chama navigator.vibrate quando o aparelho oferece (FR-031, Edge Cases).

export function vibrate(
  ms: number,
  nav: Partial<Navigator> | undefined = globalThis.navigator,
): void {
  if (typeof nav?.vibrate === 'function') {
    nav.vibrate(ms);
  }
}
