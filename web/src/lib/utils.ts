import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(
  date: string | Date | null | undefined,
  options?: { locale?: string; timezone?: string },
): string {
  if (!date) return "-"
  const locale = options?.locale || document.documentElement.lang || navigator.language || undefined
  const tz = options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  })
}

export function boolColor(active: boolean): string {
  return active ? "bg-emerald-500/15 text-emerald-300" : "bg-gray-500/15 text-gray-300"
}

export function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-300"
    case "trialing":
      return "bg-blue-500/15 text-blue-300"
    case "past_due":
      return "bg-amber-500/15 text-amber-300"
    case "canceled":
      return "bg-gray-500/15 text-gray-300"
    case "expired":
      return "bg-red-500/15 text-red-300"
    case "suspended":
      return "bg-orange-500/15 text-orange-300"
    case "revoked":
      return "bg-red-500/20 text-red-200"
    default:
      return "bg-gray-500/15 text-gray-300"
  }
}
