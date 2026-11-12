import { formatInTimeZone } from "date-fns-tz";

/** 唯一时间源：所有日期按 Asia/Shanghai 计算（DEV_SPEC 5.1 / T-03 / T-05 / T-06） */
export const TZ = "Asia/Shanghai";

/** 取 Asia/Shanghai 的当天日期字符串 YYYY-MM-DD */
export function shanghaiToday(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** 把 YYYY-MM-DD 变成 UTC 零点，避免本地时区/夏令时影响天数差 */
export function toUtcDay(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toUtcDay(toISO) - toUtcDay(fromISO)) / 86_400_000);
}

/** 未来信倒计时：差值向上取整，负值归零（DEV_SPEC 6.7） */
export function daysLeft(unlockAt: string, today: string = shanghaiToday()): number {
  return Math.max(0, Math.ceil((toUtcDay(unlockAt) - toUtcDay(today)) / 86_400_000));
}

export function isExpired(expiresAt: string | undefined, today: string = shanghaiToday()): boolean {
  if (!expiresAt) return false;
  return daysBetween(today, expiresAt) < 0;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 周年日：2 月 29 日出生按次年 2 月 28 日计算（T-01） */
export function anniversaryDate(birthday: string, years: number): string {
  const [year, month, day] = birthday.split("-").map(Number);
  const targetYear = year + years;
  const maxDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return `${targetYear}-${pad(month)}-${pad(Math.min(day, maxDay))}`;
}

export interface AgeParts {
  years: number;
  months: number;
}

/** 计算周岁与月龄（按上海日期、周年日对齐） */
export function ageParts(birthday: string, today: string = shanghaiToday()): AgeParts {
  let years = Number(today.slice(0, 4)) - Number(birthday.slice(0, 4));
  let lastAnniversary = anniversaryDate(birthday, years);
  if (daysBetween(lastAnniversary, today) < 0) {
    years -= 1;
    lastAnniversary = anniversaryDate(birthday, years);
  }
  const [ly, lm] = lastAnniversary.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let months = (ty - ly) * 12 + (tm - lm);
  if (td < Number(lastAnniversary.slice(8, 10))) months -= 1;
  if (months < 0) months = 0;
  return { years: Math.max(0, years), months };
}

/**
 * 文案：生日当天仍显示「365 天 / 366 天」，之后显示「1 岁 3 个月」。
 * 365 与 366 由真实天数差决定（T-03 / T-07）。
 */
export function ageText(birthday: string, today: string = shanghaiToday()): string {
  const days = daysBetween(birthday, today);
  const firstAnniversary = anniversaryDate(birthday, 1);
  if (daysBetween(firstAnniversary, today) <= 0) {
    return `${Math.max(0, days)} 天`;
  }
  const { years, months } = ageParts(birthday, today);
  return months > 0 ? `${years} 岁 ${months} 个月` : `${years} 岁`;
}

/** 2025.04.17 */
export function dottedDate(isoDate: string): string {
  return isoDate.replaceAll("-", ".");
}
