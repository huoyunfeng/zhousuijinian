"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN } from "@/lib/copy";
import type { Story } from "@/lib/types";
import { validateStoryAction } from "@/lib/storyActions";

interface ContentTabProps {
  slug: string;
  story: Story | null;
  initialJson: string;
}

interface QuickFields {
  name: string;
  tagline: string;
  notes: string[];
  letterBody: string;
  unlockAt: string;
}

interface ApiResponse {
  ok?: boolean;
  error?: { message?: string; detail?: string[] };
}

function quickFromStory(story: Story | null): QuickFields {
  const hero = story?.sections.find((section) => section.kind === "hero");
  const timeline = story?.sections.find((section) => section.kind === "timeline12");
  const letter = story?.sections.find((section) => section.kind === "letter");
  const future = story?.sections.find((section) => section.kind === "futureLetter");

  return {
    name: hero && hero.kind === "hero" ? hero.name : "",
    tagline: hero && hero.kind === "hero" ? hero.tagline : "",
    notes: Array.from({ length: 12 }, (_, index) => {
      if (!timeline || timeline.kind !== "timeline12") return "";
      return timeline.items.find((item) => item.month === index + 1)?.note ?? "";
    }),
    letterBody: letter && letter.kind === "letter" ? letter.body : "",
    unlockAt: future && future.kind === "futureLetter" ? future.unlockAt : "",
  };
}

function applyQuick(json: Record<string, unknown>, quick: QuickFields): void {
  const sections = Array.isArray(json.sections) ? json.sections : [];
  for (const raw of sections) {
    if (typeof raw !== "object" || raw === null) continue;
    const section = raw as Record<string, unknown>;
    if (section.kind === "hero") {
      section.name = quick.name;
      section.tagline = quick.tagline;
    }
    if (section.kind === "timeline12") {
      const items = Array.isArray(section.items) ? section.items : [];
      for (const item of items) {
        if (typeof item !== "object" || item === null) continue;
        const entry = item as Record<string, unknown>;
        const month = typeof entry.month === "number" ? entry.month : 0;
        const note = quick.notes[month - 1];
        if (note) entry.note = note;
      }
    }
    if (section.kind === "letter") section.body = quick.letterBody;
    if (section.kind === "futureLetter") section.unlockAt = quick.unlockAt;
  }
}

export function ContentTab({ slug, story, initialJson }: ContentTabProps) {
  const router = useRouter();
  const [quick, setQuick] = useState<QuickFields>(() => quickFromStory(story));
  const [jsonText, setJsonText] = useState(initialJson);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const setNote = (index: number, value: string) => {
    setQuick((current) => {
      const notes = [...current.notes];
      notes[index] = value;
      return { ...current, notes };
    });
  };

  const parseJson = (): Record<string, unknown> | null => {
    try {
      const value: unknown = JSON.parse(jsonText);
      if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not object");
      return value as Record<string, unknown>;
    } catch {
      setMessage(ADMIN.detail.content.parseError);
      setErrors([]);
      return null;
    }
  };

  const format = () => {
    const parsed = parseJson();
    if (!parsed) return;
    setJsonText(JSON.stringify(parsed, null, 2));
    setMessage("");
  };

  const validate = async () => {
    const parsed = parseJson();
    if (!parsed) return;
    applyQuick(parsed, quick);
    setBusy(true);
    try {
      const result = await validateStoryAction(parsed);
      setErrors(result.errors);
      setMessage(result.ok ? ADMIN.detail.content.valid : ADMIN.detail.content.invalid);
    } catch {
      setMessage(ADMIN.detail.content.invalid);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const parsed = parseJson();
    if (!parsed) return;
    applyQuick(parsed, quick);
    setBusy(true);
    setErrors([]);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: parsed }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || payload.ok === false) {
        setErrors(payload.error?.detail ?? []);
        setMessage(payload.error?.message ?? ADMIN.detail.content.invalid);
        return;
      }
      setMessage(ADMIN.detail.content.saved);
      router.refresh();
    } catch {
      setMessage(ADMIN.detail.content.invalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.content.quickTitle}</h2>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.content.name}
          <input
            className="admin-input mt-1"
            value={quick.name}
            onChange={(event) => setQuick({ ...quick, name: event.target.value })}
          />
        </label>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.content.tagline}
          <input
            className="admin-input mt-1"
            value={quick.tagline}
            onChange={(event) => setQuick({ ...quick, tagline: event.target.value })}
          />
        </label>
        <div className="text-xs text-ink-2">
          {ADMIN.detail.content.notes}
          <div className="mt-1 grid grid-cols-2 gap-2">
            {quick.notes.map((note, index) => (
              <input
                key={index}
                className="admin-input"
                placeholder={String(index + 1)}
                value={note}
                onChange={(event) => setNote(index, event.target.value)}
              />
            ))}
          </div>
        </div>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.content.letter}
          <textarea
            className="admin-input mt-1 min-h-[160px]"
            value={quick.letterBody}
            onChange={(event) => setQuick({ ...quick, letterBody: event.target.value })}
          />
        </label>
        <label className="block text-xs text-ink-2">
          {ADMIN.detail.content.unlockAt}
          <input
            type="date"
            className="admin-input mt-1"
            value={quick.unlockAt}
            onChange={(event) => setQuick({ ...quick, unlockAt: event.target.value })}
          />
        </label>
        <button type="button" className="admin-btn" onClick={() => void save()} disabled={busy}>
          {ADMIN.detail.content.save}
        </button>
      </div>

      <div className="admin-panel space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm">{ADMIN.detail.content.json}</h2>
          <div className="flex gap-2">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={format}>
              {ADMIN.detail.content.format}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void validate()} disabled={busy}>
              {ADMIN.detail.content.validate}
            </button>
          </div>
        </div>
        <textarea
          className="admin-textarea"
          value={jsonText}
          spellCheck={false}
          onChange={(event) => setJsonText(event.target.value)}
        />
        {message ? <p className="text-[11px] text-accent">{message}</p> : null}
        {errors.length > 0 ? (
          <ul className="space-y-1">
            {errors.map((error) => (
              <li key={error} className="text-[11px] text-accent">
                {error}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
