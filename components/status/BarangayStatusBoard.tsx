"use client"

import React, { useState, useMemo } from "react"
import { Search, Filter, Droplet, AlertTriangle, AlertOctagon, Info, HelpCircle, Clock, ShieldAlert } from "lucide-react"

export interface BarangayStatusItem {
  barangay_id: string
  barangay_code: string
  barangay_name: string
  district_name: string
  current_status: string
  current_window_end: string | null
  next_window_start: string | null
  active_incident_clusters: number
  active_advisory_count: number
  latest_psi?: number | null
  as_of?: string | null
  is_simulated?: boolean
  is_stale?: boolean
}

interface BarangayStatusBoardProps {
  items: BarangayStatusItem[]
  globalAsOf?: string | null
  isGlobalStale?: boolean
}

export function BarangayStatusBoard({
  items,
  globalAsOf,
  isGlobalStale = false,
}: BarangayStatusBoardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.district_name) set.add(item.district_name)
    })
    return Array.from(set).sort()
  }, [items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.barangay_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.district_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barangay_code.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDistrict =
        selectedDistrict === "ALL" || item.district_name === selectedDistrict

      const matchesStatus =
        selectedStatus === "ALL" ||
        item.current_status.toLowerCase() === selectedStatus.toLowerCase()

      return matchesSearch && matchesDistrict && matchesStatus
    })
  }, [items, searchQuery, selectedDistrict, selectedStatus])

  // Render status badge with icon (never color alone per WCAG AA)
  const renderStatusBadge = (status: string, isStale?: boolean) => {
    const s = status?.toUpperCase() || "UNKNOWN"

    if (isStale) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <span>Unknown (Stale)</span>
        </span>
      )
    }

    switch (s) {
      case "CRITICAL_DRY":
      case "DRY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>Critical Dry</span>
          </span>
        )
      case "DEGRADED_PRESSURE":
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Low Pressure</span>
          </span>
        )
      case "SCHEDULED_SUPPLY":
      case "FLOWING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Droplet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Flowing Supply</span>
          </span>
        )
      case "NORMAL_STANDBY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Normal Standby</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <span>Unknown</span>
          </span>
        )
    }
  }

  // Format date in Asia/Manila timezone
  const formatManilaTime = (isoString?: string | null) => {
    if (!isoString) return "No telemetry recorded"
    try {
      const date = new Date(isoString)
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date)
    } catch {
      return isoString
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Global Stale Data Banner (WR03) */}
      {isGlobalStale && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">⚠️ Stale Telemetry Warning</p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              Field gauge telemetry has not been updated within the standard 360-minute window (latest as of{" "}
              <span className="font-mono font-medium">{formatManilaTime(globalAsOf)} PHT</span>). Live conditions may
              vary. Displaying last-known operational data pursuant to WR03.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search barangay or district..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label="Search barangays"
          />
        </div>

        {/* District Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="text-sm py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label="Filter by district"
          >
            <option value="ALL">All Districts ({items.length})</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filter Badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setSelectedStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            selectedStatus === "ALL"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          All Barangays ({items.length})
        </button>
        <button
          onClick={() => setSelectedStatus("SCHEDULED_SUPPLY")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            selectedStatus === "SCHEDULED_SUPPLY"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}
        >
          💧 Flowing
        </button>
        <button
          onClick={() => setSelectedStatus("DEGRADED_PRESSURE")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            selectedStatus === "DEGRADED_PRESSURE"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          }`}
        >
          ⚠️ Low Pressure
        </button>
        <button
          onClick={() => setSelectedStatus("CRITICAL_DRY")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            selectedStatus === "CRITICAL_DRY"
              ? "bg-red-600 text-white border-red-600"
              : "bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30"
          }`}
        >
          🚫 Critical Dry
        </button>
        <button
          onClick={() => setSelectedStatus("NORMAL_STANDBY")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            selectedStatus === "NORMAL_STANDBY"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          }`}
        >
          ℹ️ Standby
        </button>
      </div>

      {/* Barangay Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <HelpCircle className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No matching barangays found</p>
          <p className="text-xs text-zinc-500 mt-1">Try clearing search filters or selecting another district.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.barangay_id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div>
                {/* Header: Name and District */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-tight">
                      {item.barangay_name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.district_name}</p>
                  </div>
                  {renderStatusBadge(item.current_status, item.is_stale)}
                </div>

                {/* Telemetry and Metrics */}
                <div className="space-y-2 py-3 my-2 border-y border-zinc-100 dark:border-zinc-800/80 text-xs">
                  {/* Gauge Pressure */}
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Gauge Pressure:</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.latest_psi !== null && item.latest_psi !== undefined
                        ? `${Number(item.latest_psi).toFixed(1)} PSI`
                        : "No reading"}
                    </span>
                  </div>

                  {/* Supply Windows */}
                  {item.current_window_end && (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Active Supply Window:</span>
                      <span className="font-mono font-medium">Until {formatManilaTime(item.current_window_end)}</span>
                    </div>
                  )}
                  {item.next_window_start && (
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
                      <span>Next Window:</span>
                      <span className="font-mono font-medium">{formatManilaTime(item.next_window_start)}</span>
                    </div>
                  )}

                  {/* Active Reports / Incidents */}
                  {item.active_incident_clusters > 0 && (
                    <div className="flex items-center justify-between text-red-700 dark:text-red-400">
                      <span>Active Citizen Reports:</span>
                      <span className="font-semibold">{item.active_incident_clusters} cluster(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: As-Of Timestamp & Source Tag */}
              <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    As of: {formatManilaTime(item.as_of)}
                  </span>
                  {item.is_simulated && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Simulated
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
