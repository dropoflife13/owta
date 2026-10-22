"use client"

import React, { useState, useMemo } from "react"
import {
  Search,
  Filter,
  Droplet,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShieldAlert,
  LayoutGrid,
  List,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import Link from "next/link"

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.district_name) set.add(item.district_name)
    })
    return Array.from(set).sort()
  }, [items])

  // Count statuses for KPI summary strip
  const statusCounts = useMemo(() => {
    let normal = 0
    let intermittent = 0
    let dry = 0
    let rationed = 0
    let unknown = 0

    items.forEach((item) => {
      const s = item.current_status?.toLowerCase() || "unknown"
      if (item.is_stale) {
        unknown++
      } else if (s === "normal" || s === "flowing" || s === "scheduled_supply" || s === "normal_standby") {
        normal++
      } else if (s === "intermittent" || s === "low" || s === "degraded_pressure") {
        intermittent++
      } else if (s === "dry" || s === "critical_dry") {
        dry++
      } else if (s === "rationed" || s === "rotational") {
        rationed++
      } else {
        unknown++
      }
    })

    return { normal, intermittent, dry, rationed, unknown, total: items.length }
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

      let matchesStatus = true
      if (selectedStatus !== "ALL") {
        const s = item.current_status?.toLowerCase() || "unknown"
        if (selectedStatus === "normal") {
          matchesStatus = s === "normal" || s === "flowing" || s === "scheduled_supply" || s === "normal_standby"
        } else if (selectedStatus === "intermittent") {
          matchesStatus = s === "intermittent" || s === "low" || s === "degraded_pressure"
        } else if (selectedStatus === "dry") {
          matchesStatus = s === "dry" || s === "critical_dry"
        } else if (selectedStatus === "rationed") {
          matchesStatus = s === "rationed" || s === "rotational"
        }
      }

      return matchesSearch && matchesDistrict && matchesStatus
    })
  }, [items, searchQuery, selectedDistrict, selectedStatus])

  // Format date in Asia/Manila timezone with relative cues
  const formatManilaTime = (isoString?: string | null) => {
    if (!isoString) return "No telemetry recorded"
    try {
      const date = new Date(isoString)
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (60 * 1000))
      
      const timeStr = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date)

      if (diffMinutes < 60) {
        return `${Math.max(1, diffMinutes)}m ago (${timeStr} PHT)`
      } else if (diffMinutes < 1440) {
        return `${Math.floor(diffMinutes / 60)}h ago (${timeStr} PHT)`
      } else {
        return new Intl.DateTimeFormat("en-PH", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(date) + " PHT"
      }
    } catch {
      return isoString
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Global Stale Telemetry Banner (WR03) */}
      {isGlobalStale && (
        <div
          role="alert"
          className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-200/80 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <h4 className="font-semibold text-amber-950 dark:text-amber-100">Telemetry Delayed / Historical Baseline</h4>
            <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Field telemetry from distribution monitoring points was last synchronized at{" "}
              <span className="font-mono font-medium">{formatManilaTime(globalAsOf)}</span>. Displaying last-known public
              status pursuant to Statutory Transparency Rule WR03.
            </p>
          </div>
        </div>
      )}

      {/* 2. Citywide KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900/60 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Barangays</span>
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-mono">
              {statusCounts.total}
            </span>
            <span className="text-xs text-slate-500">Iloilo City</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200/60 bg-white dark:bg-slate-900/60 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Normal Supply</span>
            <Droplet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300 font-mono">
              {statusCounts.normal}
            </span>
            <span className="text-xs text-slate-500">
              {statusCounts.total > 0 ? Math.round((statusCounts.normal / statusCounts.total) * 100) : 0}% of city
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200/60 bg-white dark:bg-slate-900/60 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-400">Low / Intermittent</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300 font-mono">
              {statusCounts.intermittent}
            </span>
            <span className="text-xs text-slate-500">rotational</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-200/60 bg-white dark:bg-slate-900/60 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800 dark:text-rose-400">Critical Dry</span>
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-300 font-mono">
              {statusCounts.dry}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">relief priority</span>
          </div>
        </div>
      </div>

      {/* 3. Search, Filter Bar, and View Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search barangay, district, or code..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            aria-label="Search barangays"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* District Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" aria-hidden="true" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="text-xs font-medium py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
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

          {/* View Mode Toggle (Table / Card Grid) */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="Card view"
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setSelectedStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            selectedStatus === "ALL"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setSelectedStatus("normal")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            selectedStatus === "normal"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}
        >
          Normal Supply ({statusCounts.normal})
        </button>
        <button
          onClick={() => setSelectedStatus("intermittent")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            selectedStatus === "intermittent"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          }`}
        >
          Low / Intermittent ({statusCounts.intermittent})
        </button>
        <button
          onClick={() => setSelectedStatus("dry")}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            selectedStatus === "dry"
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          }`}
        >
          Critical Dry ({statusCounts.dry})
        </button>
      </div>

      {/* 5. Main Content: Table View vs. Card Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching barangays found</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting &quot;All Districts&quot;.</p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (Calm Data Density) */
        <div className="rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th scope="col" className="py-3 px-4">Barangay</th>
                  <th scope="col" className="py-3 px-4">District</th>
                  <th scope="col" className="py-3 px-4">Current Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Gauge Pressure</th>
                  <th scope="col" className="py-3 px-4">Active Schedule</th>
                  <th scope="col" className="py-3 px-4 text-center">Incidents</th>
                  <th scope="col" className="py-3 px-4 text-right">Telemetry As Of</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                {filteredItems.map((item) => (
                  <tr
                    key={item.barangay_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span>{item.barangay_name}</span>
                        {item.is_simulated && (
                          <span
                            title="Simulated Data (Rule WR12)"
                            className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          >
                            SIM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {item.district_name}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.current_status} isStale={item.is_stale} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.latest_psi !== null && item.latest_psi !== undefined
                        ? `${Number(item.latest_psi).toFixed(1)} PSI`
                        : <span className="text-slate-400 font-sans text-xs">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      {item.current_window_end ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Active until {formatManilaTime(item.current_window_end)}
                        </span>
                      ) : item.next_window_start ? (
                        <span className="text-sky-700 dark:text-sky-400">
                          Next: {formatManilaTime(item.next_window_start)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard rotational</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.active_incident_clusters > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          {item.active_incident_clusters}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {formatManilaTime(item.as_of)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.barangay_id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-50 leading-tight">
                      {item.barangay_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.district_name}</p>
                  </div>
                  <StatusBadge status={item.current_status} isStale={item.is_stale} />
                </div>

                <div className="space-y-2 py-2.5 my-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gauge Pressure:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {item.latest_psi !== null && item.latest_psi !== undefined
                        ? `${Number(item.latest_psi).toFixed(1)} PSI`
                        : "No reading"}
                    </span>
                  </div>

                  {item.current_window_end && (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Supply Window:</span>
                      <span className="font-medium">Until {formatManilaTime(item.current_window_end)}</span>
                    </div>
                  )}

                  {item.active_incident_clusters > 0 && (
                    <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                      <span>Outage Clusters:</span>
                      <span className="font-semibold">{item.active_incident_clusters} active</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatManilaTime(item.as_of)}
                </span>
                {item.is_simulated && (
                  <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                    Simulated
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Citizen Report CTA Banner */}
      <div className="p-4 sm:p-5 rounded-xl border border-sky-200/80 bg-sky-50/70 dark:bg-sky-950/20 dark:border-sky-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
            Is your barangay experiencing an unlisted water outage?
          </h4>
          <p className="text-xs text-sky-800/90 dark:text-sky-300/90 mt-0.5">
            Help the community and emergency triage by filing an anonymous report. Verified reports escalate directly to CDRRMO tankers.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <span>Submit Report (30s)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
