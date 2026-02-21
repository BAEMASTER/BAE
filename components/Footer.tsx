import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-6 px-4 text-center z-10 relative">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/25 font-medium">
        <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
        <span className="text-white/15">|</span>
        <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
        <span className="text-white/15">|</span>
        <Link href="/guidelines" className="hover:text-white/50 transition-colors">Community Guidelines</Link>
        <span className="text-white/15">|</span>
        <a href="mailto:support@baewithme.com" className="hover:text-white/50 transition-colors">support@baewithme.com</a>
      </div>
    </footer>
  );
}
