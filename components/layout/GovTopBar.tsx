"use client"

import React, { useEffect, useState } from "react"
import { ShieldCheck, Clock, Eye, Radio, Sparkles } from "lucide-react"

export function GovTopBar() {
  const [phtTime, setPhtTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now)
      setPhtTime(`${formatted} PHT`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800 py-1 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 font-medium">
        {/* Left: Official Authority Notice */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-100 font-semibold tracking-wide">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>REPUBLIC OF THE PHILIPPINES</span>
          </div>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400 hidden md:inline">
            City Government of Iloilo Operational Water Accounting
          </span>
          <span className="text-slate-600 hidden lg:inline">•</span>
          <span className="text-emerald-400/90 hidden lg:inline flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Statutory Public Audit (Rule WR01–WR12)
          </span>
        </div>

        {/* Right: Live Clock & Transparency Signal */}
        <div className="flex items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1 font-mono text-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{phtTime || "Synchronizing PHT..."}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1 text-[10px] text-sky-400 font-mono uppercase bg-sky-950/70 border border-sky-800/60 px-1.5 py-0.5 rounded">
            <span>Live Audit Feed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
