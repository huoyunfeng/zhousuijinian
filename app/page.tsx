import Link from "next/link";
import type { Metadata } from "next";
import { LANDING, SITE } from "@/lib/copy";

export const metadata: Metadata = {
  title: SITE.defaultTitle,
  description: SITE.description,
};

export default function LandingPage() {
  return (
    <main className="story-root" data-theme="paper-warm">
      <div className="container-page flex min-h-dvh flex-col justify-center py-16">
        <p className="eyebrow">{LANDING.eyebrow}</p>
        <h1 className="mt-4 font-display text-3xl leading-tight text-ink md:text-5xl">{LANDING.title}</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-2 md:text-base">{LANDING.description}</p>

        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-3">
          {LANDING.steps.map((step) => (
            <li key={step} className="flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-accent" />
              {step}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/s/bb-20250417"
            className="rounded-full bg-accent px-6 py-3 text-sm text-bg transition hover:opacity-90"
          >
            {LANDING.sampleLabel}
          </Link>
          <span className="text-xs text-ink-3">{LANDING.sampleHint}</span>
        </div>

        <div className="mt-16 border-t border-line pt-6">
          <Link href="/admin/login" className="text-xs text-ink-3 underline-offset-4 hover:underline">
            {LANDING.enterAdmin}
          </Link>
        </div>
      </div>
    </main>
  );
}
