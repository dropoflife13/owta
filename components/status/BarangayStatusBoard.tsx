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
  MapPin,
  Download,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { DistrictMapVisualizer } from "./DistrictMapVisualizer"
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
  const [onlyOutages, setOnlyOutages] = useState<boolean>(false)
  const [onlyWithIncidents, setOnlyWithIncidents] = useState<boolean>(false)

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

      if (onlyOutages) {
        const s = item.current_status?.toLowerCase() || "unknown"
        if (s !== "dry" && s !== "critical_dry" && s !== "intermittent" && s !== "low") {
          return false
        }
      }

      if (onlyWithIncidents && item.active_incident_clusters <= 0) {
        return false
      }

      return matchesSearch && matchesDistrict && matchesStatus
    })
  }, [items, searchQuery, selectedDistrict, selectedStatus, onlyOutages, onlyWithIncidents])

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

  // Export filtered data to CSV for researchers/government audit
  const handleExportCSV = () => {
    const headers = [
      "Barangay Code",
      "Barangay Name",
      "District",
      "Status",
      "Latest PSI",
      "Active Clusters",
      "As Of Time (PHT)",
      "Is Simulated",
      "Is Stale",
    ]

    const rows = filteredItems.map((b) => [
      b.barangay_code,
      `"${b.barangay_name}"`,
      `"${b.district_name}"`,
      b.current_status,
      b.latest_psi !== null && b.latest_psi !== undefined ? b.latest_psi : "",
      b.active_incident_clusters,
      b.as_of || "",
      b.is_simulated ? "YES" : "NO",
      b.is_stale ? "YES" : "NO",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `owta_water_status_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Global Stale Telemetry Warning Banner (WR03) */}
      {isGlobalStale && (
        <div
          role="alert"
          className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/20 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <h4 className="font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-2">
              <span>Telemetry Notice: Field Ingestion Window Delayed</span>
              <Badge variant="warning">Rule WR03</Badge>
            </h4>
            <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              District monitoring telemetry was last synchronized at{" "}
              <span className="font-mono font-medium">{formatManilaTime(globalAsOf)}</span>. Displaying last-known public
              status pursuant to Statutory Transparency Rule WR03.
            </p>
          </div>
        </div>
      )}

      {/* 2. Citywide Telemetry Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Barangays Monitored */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Coverage Scope
            </span>
            <Badge variant="outline">7 Districts</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-mono">
              {statusCounts.total}
            </span>
            <span className="text-xs text-slate-500 font-medium">Barangays</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">100% PostGIS Geocoded</p>
        </div>

        {/* Normal Operational Supply */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Normal Supply
            </span>
            <Droplet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300 font-mono">
              {statusCounts.normal}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({statusCounts.total > 0 ? Math.round((statusCounts.normal / statusCounts.total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2">
            <Progress
              value={statusCounts.total > 0 ? (statusCounts.normal / statusCounts.total) * 100 : 0}
              className="h-1.5 bg-emerald-100 dark:bg-emerald-950"
              indicatorClassName="bg-emerald-500"
            />
          </div>
        </div>

        {/* Rotational / Low Pressure */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Low / Intermittent
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300 font-mono">
              {statusCounts.intermittent}
            </span>
            <span className="text-xs text-slate-500 font-medium">Rotational</span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            Pressure &lt; 7.0 PSI baseline
          </p>
        </div>

        {/* Severe Outage / Relief Priority */}
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-400">
              Critical Dry
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-rose-700 dark:text-rose-300 font-mono">
              {statusCounts.dry}
            </span>
            <Badge variant="destructive">CDRRMO Queue</Badge>
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
            Emergency tanker priority
          </p>
        </div>
      </div>

      {/* 3. Main Views (Tabs: Table, District Map, Cards) */}
      <Tabs defaultValue="table" className="w-full space-y-4">
        {/* Top Control Bar with Tabs, Search, Filters, and Toggles */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          {/* View Mode Tabs */}
          <TabsList>
            <TabsTrigger value="table" className="flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" />
              <span>Status Matrix</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>District Zones</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Facility Cards</span>
            </TabsTrigger>
          </TabsList>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by barangay, code, or district..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              aria-label="Filter barangays"
            />
          </div>

          {/* Actions & CSV Export */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
              aria-label="Filter by district"
            >
              <option value="ALL">All Districts ({items.length})</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
              title="Download verified operational data as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4. Filter Toggles Strip (Switches) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-slate-900/60 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Toggle 1: Outages Only */}
            <div className="flex items-center gap-2">
              <Switch
                id="toggle-outages"
                checked={onlyOutages}
                onCheckedChange={setOnlyOutages}
              />
              <label htmlFor="toggle-outages" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Show Outages Only
              </label>
            </div>

            {/* Toggle 2: Active Citizen Incidents Only */}
            <div className="flex items-center gap-2">
              <Switch
                id="toggle-incidents"
                checked={onlyWithIncidents}
                onCheckedChange={setOnlyWithIncidents}
              />
              <label htmlFor="toggle-incidents" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Active Citizen Clusters Only
              </label>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Showing {filteredItems.length} of {items.length} Barangays
          </div>
        </div>

        {/* TAB 1: DISTRICT MAP VISUALIZER */}
        <TabsContent value="map">
          <DistrictMapVisualizer
            items={items}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(d) => setSelectedDistrict(d)}
          />
        </TabsContent>

        {/* TAB 2: HIGH-DENSITY STATUS TABLE */}
        <TabsContent value="table">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching barangays found</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing active toggles or selecting &quot;All Districts&quot;.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <th scope="col" className="py-3 px-4">Barangay &amp; Code</th>
                      <th scope="col" className="py-3 px-4">District</th>
                      <th scope="col" className="py-3 px-4">Operational Status</th>
                      <th scope="col" className="py-3 px-4 text-right">Pressure Gauge</th>
                      <th scope="col" className="py-3 px-4">Scheduled Window</th>
                      <th scope="col" className="py-3 px-4 text-center">Citizen Clusters</th>
                      <th scope="col" className="py-3 px-4 text-right">Last Telemetry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredItems.map((item) => {
                      const psiVal = item.latest_psi !== null && item.latest_psi !== undefined ? Number(item.latest_psi) : null

                      return (
                        <tr
                          key={item.barangay_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Barangay Name & Sim Tag */}
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span>{item.barangay_name}</span>
                              <span className="font-mono text-[10px] text-slate-400 font-normal">
                                ({item.barangay_code})
                              </span>
                              {item.is_simulated && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      SIM
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Rule WR12: Isolated development test telemetry.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>

                          {/* District */}
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {item.district_name}
                          </td>

                          {/* Operational Status Badge */}
                          <td className="py-3 px-4">
                            <StatusBadge status={item.current_status} isStale={item.is_stale} />
                          </td>

                          {/* Pressure Gauge + Micro Bar */}
                          <td className="py-3 px-4 text-right">
                            {psiVal !== null ? (
                              <div className="inline-flex flex-col items-end gap-1">
                                <span className={`font-mono font-bold ${
                                  psiVal >= 7.0 ? "text-emerald-700 dark:text-emerald-400" : psiVal >= 4.0 ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400"
                                }`}>
                                  {psiVal.toFixed(1)} PSI
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(100, (psiVal / 20) * 100)}%` }}
                                    className={`h-full ${
                                      psiVal >= 7.0 ? "bg-emerald-500" : psiVal >= 4.0 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-sans text-xs">—</span>
                            )}
                          </td>

                          {/* Scheduled Window */}
                          <td className="py-3 px-4 text-xs">
                            {item.current_window_end ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Active until {formatManilaTime(item.current_window_end)}
                              </span>
                            ) : item.next_window_start ? (
                              <span className="text-sky-700 dark:text-sky-400">
                                Next: {formatManilaTime(item.next_window_start)}
                              </span>
                            ) : (
                              <span className="text-slate-400">Rotational supply</span>
                            )}
                          </td>

                          {/* Citizen Incident Clusters */}
                          <td className="py-3 px-4 text-center">
                            {item.active_incident_clusters > 0 ? (
                              <Badge variant="destructive">
                                {item.active_incident_clusters} active
                              </Badge>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono">0</span>
                            )}
                          </td>

                          {/* Telemetry As Of */}
                          <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {formatManilaTime(item.as_of)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: OPERATIONAL CARDS */}
        <TabsContent value="cards">
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.district_name} • <span className="font-mono">{item.barangay_code}</span>
                      </p>
                    </div>
                    <StatusBadge status={item.current_status} isStale={item.is_stale} />
                  </div>

                  <div className="space-y-2 py-2.5 my-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Gauge Pressure:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
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
                        <Badge variant="destructive">{item.active_incident_clusters} active</Badge>
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
                    <Badge variant="purple">Simulated</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 5. Citizen Report Emergency CTA Banner */}
      <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/20 dark:border-sky-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping"></span>
            <h4 className="text-sm font-bold text-sky-950 dark:text-sky-100">
              Experiencing an unverified municipal water outage?
            </h4>
          </div>
          <p className="text-xs text-sky-800/90 dark:text-sky-300/90 max-w-2xl">
            Reports are spatial-clustered within 200m and automatically queued on the Barangay Official Triage Desk. Verified high-severity incidents escalate directly to CDRRMO emergency water tanker dispatch.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Report Outage (30s)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
