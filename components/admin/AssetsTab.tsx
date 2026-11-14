"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN } from "@/lib/copy";
import type { AssetCheckItem } from "@/lib/orders";
import type { ImageManifest } from "@/lib/types";
import { StoryContext } from "@/components/StoryContext";
import { SmartImage } from "@/components/ui/SmartImage";

interface AssetsTabProps {
  slug: string;
  manifest: ImageManifest;
  thumbs: string[];
  checklist: AssetCheckItem[];
}

type Purpose = "cover" | "monthly" | "gallery" | "bgm";

interface ApiResponse {
  ok?: boolean;
  data?: { saved?: string[]; warnings?: string[] };
  error?: { message?: string; detail?: string[] };
}

const GALLERY_SLOTS = 30;
const MONTH_SLOTS = 12;

export function AssetsTab({ slug, manifest, thumbs, checklist }: AssetsTabProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [purpose, setPurpose] = useState<Purpose>("monthly");
  const [month, setMonth] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const galleryFilled = Array.from({ length: GALLERY_SLOTS }, (_, index) => `p${String(index + 1).padStart(2, "0")}`).filter(
    (key) => manifest[key],
  ).length;

  const upload = async () => {
    if (busy || files.length === 0) return;
    setBusy(true);
    setMessage("");
    setWarnings([]);
    try {
      const form = new FormData();
      form.set("purpose", purpose);
      if (purpose === "monthly") form.set("month", String(month));
      for (const file of files) form.append("files", file);
      const response = await fetch(`/api/admin/orders/${slug}/assets`, { method: "POST", body: form });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || payload.ok === false) {
        const detail = payload.error?.detail?.join("；");
        setMessage(detail ?? payload.error?.message ?? ADMIN.errors.general);
        return;
      }
      const saved = payload.data?.saved ?? [];
      if (saved.length > 0) setMessage(ADMIN.detail.assets.uploaded(saved.map((name) => name.slice(0, name.lastIndexOf("."))).join("、")));
      setWarnings(payload.data?.warnings ?? []);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setMessage(ADMIN.errors.general);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.assets.title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-ink-2">
            {ADMIN.detail.assets.purpose}
            <select
              className="admin-select mt-1"
              value={purpose}
              onChange={(event) => {
                setPurpose(event.target.value as Purpose);
                setFiles([]);
                setMessage("");
                setWarnings([]);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <option value="monthly">{ADMIN.detail.assets.purposes.monthly}</option>
              <option value="gallery">{ADMIN.detail.assets.purposes.gallery}</option>
              <option value="cover">{ADMIN.detail.assets.purposes.cover}</option>
              <option value="bgm">{ADMIN.detail.assets.purposes.bgm}</option>
            </select>
          </label>
          {purpose === "monthly" ? (
            <label className="text-xs text-ink-2">
              {ADMIN.detail.assets.month}
              <select
                className="admin-select mt-1"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {Array.from({ length: MONTH_SLOTS }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {ADMIN.detail.assets.monthOption(index + 1)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            multiple={purpose === "gallery"}
            className="text-xs"
            accept={purpose === "bgm" ? "audio/mpeg" : "image/*"}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <button type="button" className="admin-btn" onClick={() => void upload()} disabled={busy || files.length === 0}>
            {busy ? ADMIN.detail.assets.uploading : ADMIN.detail.assets.upload}
          </button>
        </div>
        <p className="text-[11px] text-ink-3">
          {purpose === "monthly"
            ? ADMIN.detail.assets.monthHint
            : purpose === "gallery"
              ? ADMIN.detail.assets.galleryHint(galleryFilled, GALLERY_SLOTS)
              : ADMIN.detail.assets.dragHint}
        </p>
        {files.length > 0 ? (
          <p className="text-[11px] text-ink-2">{files.map((file) => file.name).join(" · ")}</p>
        ) : null}
        {message ? <p className="text-[11px] text-accent">{message}</p> : null}
        {warnings.map((warning) => (
          <p key={warning} className="text-[11px] text-accent">
            {warning}
          </p>
        ))}
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.assets.checklist}</h2>
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center justify-between text-xs">
              <span className="text-ink-2">{ADMIN.detail.assets.checks[item.key]}</span>
              <span className={item.present ? "text-ink-2" : "text-accent"}>
                {item.present ? ADMIN.detail.assets.present : ADMIN.detail.assets.missing}
                {" · "}
                {item.count}/{item.total}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-panel space-y-3">
        <h2 className="font-display text-sm">{ADMIN.detail.assets.preview}</h2>
        <StoryContext.Provider
          value={{ slug, base: `/orders/${slug}`, manifest, theme: "paper-warm", preview: false, hero: null }}
        >
          <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
            {thumbs.map((key) => (
              <SmartImage
                key={key}
                photo={{ src: `${key}.jpg`, alt: "", ratio: "4:5" }}
                sizes="160px"
                className="overflow-hidden rounded-sm"
              />
            ))}
          </div>
        </StoryContext.Provider>
        {thumbs.length === 0 ? <p className="text-[11px] text-ink-3">{ADMIN.detail.assets.missing}</p> : null}
      </div>
    </div>
  );
}
