export default function TheiaAvatar({ status = false, className = "" }: { status?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b3db98]/35 bg-[#223a32] text-lg font-semibold text-[#d9f5b8] ${className}`}>
    T{status && <span className="theia-online-dot absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[#c9ec8a]" />}
  </span>;
}
