import { anniversaryDate, ageText, dottedDate, shanghaiToday } from "@/lib/date";
import { OUTRO, SECTION_ANCHORS, SECTION_TITLES } from "@/lib/copy";
import { findHeroSection } from "@/lib/story";
import type { Story } from "@/lib/types";
import type { NavItem } from "@/components/ui/SectionNav";

export function buildHeroContext(story: Story) {
  const hero = findHeroSection(story);
  if (!hero || hero.kind !== "hero") return null;
  return {
    name: hero.name,
    birthday: hero.birthday,
    tagline: hero.tagline,
    cover: hero.cover,
    showAge: hero.showAge,
    ageText: ageText(hero.birthday, shanghaiToday()),
  };
}

export function buildNav(story: Story): NavItem[] {
  return story.sections
    .filter((section) => section.enabled)
    .map((section) => ({
      anchor: SECTION_ANCHORS[section.kind] ?? section.id,
      title: SECTION_TITLES[section.kind].title || OUTRO.sign,
    }));
}

export { anniversaryDate, dottedDate };
