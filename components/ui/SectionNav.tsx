"use client";

import { useEffect, useState } from "react";
import { NAV } from "@/lib/copy";

export interface NavItem {
  anchor: string;
  title: string;
}

/** 桌面端章节导航 + 顶部进度条（DEV_SPEC 5.4） */
export function SectionNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.anchor ?? "");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.anchor))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <div
        className="progress-bar"
        style={{ width: "100%", transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <nav className="section-nav" aria-label={NAV.label}>
        {items.map((item) => (
          <a
            key={item.anchor}
            href={`#${item.anchor}`}
            className="section-nav__dot"
            data-active={active === item.anchor}
            aria-label={NAV.jump(item.title)}
            title={item.title}
          />
        ))}
      </nav>
    </>
  );
}
