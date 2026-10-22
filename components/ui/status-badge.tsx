import React from "react"
import { Droplet, AlertTriangle, AlertOctagon, RefreshCw, HelpCircle, ShieldAlert } from "lucide-react"

export type WaterStatus = "normal" | "intermittent" | "dry" | "rationed" | "unknown" | "simulated" | string

interface StatusBadgeProps {
  status: WaterStatus
  isStale?: boolean
  isSimulated?: boolean
  className?: string
  showIcon?: boolean
  label?: string
}

export function StatusBadge({
  status,
  isStale = false,
  isSimulated = false,
  className = "",
  showIcon = true,
  label,
}: StatusBadgeProps) {
  // If explicitly flagged stale, override status to unknown
  const effectiveStatus = isStale ? "unknown" : status?.toLowerCase() || "unknown"

  if (isSimulated) {
    return (
      <span
        data-slot="status-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 ${className}`}
      >
        {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" />}
        <span>{label || "Simulated Data"}</span>
      </span>
    )
  }

  switch (effectiveStatus) {
    case "normal":
    case "flowing":
    case "scheduled_supply":
    case "normal_standby":
      return (
        <span
          data-slot="status-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60 ${className}`}
        >
          {showIcon && <Droplet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
          <span>{label || "Normal Supply"}</span>
        </span>
      )

    case "intermittent":
    case "low":
    case "degraded_pressure":
      return (
        <span
          data-slot="status-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          <span>{label || "Intermittent / Low"}</span>
        </span>
      )

    case "dry":
    case "critical_dry":
      return (
        <span
          data-slot="status-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 ${className}`}
        >
          {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />}
          <span>{label || "Critical Dry"}</span>
        </span>
      )

    case "rationed":
    case "rotational":
      return (
        <span
          data-slot="status-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-sky-50 text-sky-900 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/60 ${className}`}
        >
          {showIcon && <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />}
          <span>{label || "Rationed Schedule"}</span>
        </span>
      )

    case "unknown":
    default:
      return (
        <span
          data-slot="status-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />}
          <span>{label || (isStale ? "Unknown (Stale >24h)" : "Unknown")}</span>
        </span>
      )
  }
}
