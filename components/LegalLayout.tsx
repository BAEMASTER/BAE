'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A0033] via-[#0D001A] to-[#000033] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white transition-colors mb-10"
        >
          <ArrowLeft size={16} />
          Back to BAE
        </Link>

        {/* Content */}
        <article className="legal-content">
          {children}
        </article>

        {/* Bottom nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/30">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link href="/guidelines" className="hover:text-white/60 transition-colors">Community Guidelines</Link>
          <a href="mailto:support@baewithme.com" className="hover:text-white/60 transition-colors">Contact</a>
        </div>
      </div>

      <style jsx global>{`
        .legal-content h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, #fde047, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .legal-content h2 {
          font-size: 1.35rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          color: white;
        }
        .legal-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: rgba(255, 255, 255, 0.9);
        }
        .legal-content p {
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.75;
          margin-bottom: 1rem;
          font-size: 0.925rem;
        }
        .legal-content .subtitle {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
          margin-bottom: 2rem;
        }
        .legal-content ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .legal-content ul li {
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
          margin-bottom: 0.35rem;
          font-size: 0.925rem;
        }
        .legal-content a {
          color: #fde047;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-content a:hover {
          color: #fef08a;
        }
        .legal-content .copyright {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.25);
          font-size: 0.8rem;
        }
        .legal-content .contact-block {
          margin-top: 1rem;
          padding: 1.25rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .legal-content .contact-block p {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
