// Heroicons (24/outline) as raw SVG markup, for HTML built as strings outside React (e.g. the embeddable widget).
// Path data is copied verbatim from @heroicons/react/24/outline; React components should import from that package directly.
const paths = {
  'arrows-pointing-out': 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15',
  'arrows-pointing-in': 'M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25',
  'paper-airplane': 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
} as const;

export type HeroiconName = keyof typeof paths;

export function heroicon(name: HeroiconName, size = 24, className?: string): string {
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon"><path stroke-linecap="round" stroke-linejoin="round" d="${paths[name]}"/></svg>`;
}
