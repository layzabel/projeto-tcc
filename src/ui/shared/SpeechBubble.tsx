// Balão de fala do mascote: região aria-live para leitores de tela (contracts/screens.md §5).

export function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="balao" aria-live="polite" role="status">
      {text}
    </div>
  );
}
