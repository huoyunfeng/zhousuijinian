import type { ComponentType } from "react";
import { Brush } from "./Brush";
import { Book } from "./Book";
import { Abacus } from "./Abacus";
import { SealItem } from "./SealItem";
import { Coin } from "./Coin";
import { Stethoscope } from "./Stethoscope";

interface IconProps {
  className?: string;
}

const ICONS: Record<string, ComponentType<IconProps>> = {
  brush: Brush,
  book: Book,
  abacus: Abacus,
  seal: SealItem,
  coin: Coin,
  stethoscope: Stethoscope,
};

interface ZhuazhouIconProps {
  itemKey: string;
  className?: string;
}

/** 抓周物品手绘图标：未知 key 回退到线装书（DEV_SPEC 6.4.2） */
export function ZhuazhouIcon({ itemKey, className }: ZhuazhouIconProps) {
  const Icon = ICONS[itemKey] ?? Book;
  return <Icon className={className} />;
}
