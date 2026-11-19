export const launcherAnimationFrames = {
  glow: [
    { offset: 0, boxShadow: '0 0 0 0 var(--launcher-glow), 0 0 0 0 var(--launcher-glow)' },
    { offset: 0.3, boxShadow: '0 0 0 12px transparent, 0 0 0 0 var(--launcher-glow)' },
    { offset: 0.68, boxShadow: '0 0 0 18px transparent, 0 0 0 16px transparent' },
    { offset: 1, boxShadow: '0 0 0 18px transparent, 0 0 0 16px transparent' },
  ],
  pulse: [
    { offset: 0, translate: '0 0' },
    { offset: 0.2, translate: '0 -10px' },
    { offset: 0.4, translate: '0 0' },
    { offset: 0.56, translate: '0 -5px' },
    { offset: 0.75, translate: '0 0' },
    { offset: 1, translate: '0 0' },
  ],
} satisfies Record<string, Keyframe[]>;

export const launcherAnimationOptions = { duration: 1000, easing: 'ease-in-out' };
export const launcherAnimationRepeatDelay = 15000;

export function launcherAnimation(value: unknown): 'off' | 'glow' | 'pulse' {
  return value === 'glow' || value === 'pulse' ? value : 'off';
}
