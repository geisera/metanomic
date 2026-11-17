export default function TheiaAvatar({ status = false, className = "" }: { status?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--site-b3db98)]/35 bg-[var(--site-223a32)] text-lg font-semibold text-[var(--site-d9f5b8)] ${className}`}>
    T{status && <span className="theia-online-dot absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#c9ec8a]" />}
  </span>;
}
