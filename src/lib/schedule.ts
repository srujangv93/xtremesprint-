// Helper utilities for calculating problem daily schedule and unlock states (IST / UTC+05:30)

// Day 4 is today: October 19, 2026
// Day 1 is October 16, 2026
export const DAY_1_DATE_UTC = new Date("2026-10-16T00:00:00Z");

export type DayStatus = "locked" | "active" | "ended";

export interface DayWindow {
  day: number;
  openTime: Date; // 8:00 AM IST
  closeTime: Date; // 9:00 PM IST
  status: DayStatus;
}

/**
 * Returns the open and close timestamps for a given contest day in Indian Standard Time (IST)
 * 8:00 AM IST = 02:30 AM UTC
 * 9:00 PM IST = 15:30 PM UTC
 */
export function getDayWindow(day: number): DayWindow {
  // Day 4 = 2026-10-19
  // Year 2026, Month 10 (0-indexed = 9), Day offset = 16 + (day - 1)
  const dateNum = 16 + (day - 1);
  const openTime = new Date(Date.UTC(2026, 9, dateNum, 2, 30, 0)); // 08:00 AM IST
  const closeTime = new Date(Date.UTC(2026, 9, dateNum, 15, 30, 0)); // 21:00 PM IST

  const now = new Date();

  let status: DayStatus = "active";
  if (now < openTime) {
    status = "locked";
  } else if (now >= closeTime) {
    status = "ended";
  } else {
    status = "active";
  }

  return { day, openTime, closeTime, status };
}

/**
 * Returns human-readable label and status description for a day
 */
export function getDayMeta(day: number) {
  const window = getDayWindow(day);
  const dateNum = 16 + (day - 1);
  const dateObj = new Date(Date.UTC(2026, 9, dateNum));
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata"
  });

  const isToday = day === 4;

  let statusLabel = "";
  let badgeColor = "";

  switch (window.status) {
    case "active":
      statusLabel = "Active · Ends at 9:00 PM IST";
      badgeColor = "text-emerald-400 bg-emerald-950/60 border-emerald-800/60";
      break;
    case "ended":
      statusLabel = "Practice Mode · 0 Points";
      badgeColor = "text-amber-400 bg-amber-950/60 border-amber-800/60";
      break;
    case "locked":
      statusLabel = "Locked · Opens at 8:00 AM IST";
      badgeColor = "text-zinc-400 bg-zinc-900 border-zinc-700/60";
      break;
  }

  return {
    ...window,
    dateStr,
    isToday,
    statusLabel,
    badgeColor
  };
}

/**
 * Given a problem day and standard points, returns whether submission awards points
 */
export function getAwardablePoints(day: number, standardPoints: number): {
  awardPoints: number;
  isPractice: boolean;
  isLocked: boolean;
} {
  const window = getDayWindow(day);
  if (window.status === "locked") {
    return { awardPoints: 0, isPractice: false, isLocked: true };
  }
  if (window.status === "ended") {
    // Post 9pm: can practice for 0 points
    return { awardPoints: 0, isPractice: true, isLocked: false };
  }
  return { awardPoints: standardPoints, isPractice: false, isLocked: false };
}

