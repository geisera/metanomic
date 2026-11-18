export const launcherAnimationFrames = {
  glow: [
    { boxShadow: '0 0 0 0 transparent' },
    { boxShadow: '0 0 14px 2px var(--launcher-glow)' },
    { boxShadow: '0 0 0 0 transparent' },
  ],
  pulse: [{ scale: '1' }, { scale: '1.04' }, { scale: '1' }],
} satisfies Record<string, Keyframe[]>;

export const launcherAnimationOptions = { duration: 1000, easing: 'ease-in-out' };

export function launcherAnimation(value: unknown): 'off' | 'glow' | 'pulse' {
  return value === 'glow' || value === 'pulse' ? value : 'off';
}
