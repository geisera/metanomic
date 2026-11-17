import TheiaLink from "./TheiaLink";

export default function TheiaNav() {
  return <TheiaLink source="nav" className="navlink inline-flex items-center gap-2 rounded">
    Try Theia <span className="rounded border border-[var(--site-506c53)] px-1.5 py-0.5 text-[10px] text-[var(--site-c9ec8a)]">Live AI</span>
  </TheiaLink>;
}
