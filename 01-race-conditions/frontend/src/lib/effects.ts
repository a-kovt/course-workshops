const BURSTS = [
  { angle: 90, delay: 0 },
  { angle: 60, delay: 150 },
  { angle: 120, delay: 300 },
];

export async function celebrate(from: HTMLElement | null): Promise<void> {
  const { default: confetti } = await import('canvas-confetti');
  const rect = from?.getBoundingClientRect();
  const origin = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : { x: 0.5, y: 0.6 };

  for (const { angle, delay } of BURSTS) {
    setTimeout(() => {
      void confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 45,
        angle,
        origin,
        disableForReducedMotion: true,
      });
    }, delay);
  }
}
