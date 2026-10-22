"use client"

import React, { useMemo } from "react"
import { Droplet, AlertTriangle, AlertOctagon, Users, MapPin, Gauge } from "lucide-react"
import { BarangayStatusItem } from "./BarangayStatusBoard"

interface DistrictMapVisualizerProps {
  items: BarangayStatusItem[]
  selectedDistrict: string
  onSelectDistrict: (district: string) => void
}

interface DistrictSummary {
  name: string
  totalBarangays: number
  normalCount: number
  intermittentCount: number
  dryCount: number
  unknownCount: number
  totalClusters: number
  avgPsi: number | null
  status: "normal" | "intermittent" | "dry" | "unknown"
}

export function DistrictMapVisualizer({
  items,
  selectedDistrict,
  onSelectDistrict,
}: DistrictMapVisualizerProps) {
  // Aggregate data by district
  const districtSummaries: DistrictSummary[] = useMemo(() => {
    const map = new Map<string, {
      total: number
      normal: number
      intermittent: number
      dry: number
      unknown: number
      clusters: number
      psiSum: number
      psiCount: number
    }>()

    // Ensure all 7 main districts exist in the map
    const defaultDistricts = [
      "City Proper",
      "Jaro",
      "Molo",
      "Mandurriao",
      "La Paz",
      "Lapuz",
      "Villa Arevalo",
    ]

    defaultDistricts.forEach((d) => {
      map.set(d, {
        total: 0,
        normal: 0,
        intermittent: 0,
        dry: 0,
        unknown: 0,
        clusters: 0,
        psiSum: 0,
        psiCount: 0,
      })
    })

    items.forEach((item) => {
      const dName = item.district_name || "Mandurriao"
      let stats = map.get(dName)
      if (!stats) {
        stats = {
          total: 0,
          normal: 0,
          intermittent: 0,
          dry: 0,
          unknown: 0,
          clusters: 0,
          psiSum: 0,
          psiCount: 0,
        }
        map.set(dName, stats)
      }

      stats.total += 1
      stats.clusters += item.active_incident_clusters || 0

      if (item.latest_psi !== null && item.latest_psi !== undefined) {
        stats.psiSum += Number(item.latest_psi)
        stats.psiCount += 1
      }

      const s = item.current_status?.toLowerCase() || "unknown"
      if (item.is_stale) {
        stats.unknown += 1
      } else if (s === "normal" || s === "flowing" || s === "scheduled_supply" || s === "normal_standby") {
        stats.normal += 1
      } else if (s === "intermittent" || s === "low" || s === "degraded_pressure") {
        stats.intermittent += 1
      } else if (s === "dry" || s === "critical_dry") {
        stats.dry += 1
      } else {
        stats.unknown += 1
      }
    })

    const results: DistrictSummary[] = []
    map.forEach((stats, name) => {
      let status: "normal" | "intermittent" | "dry" | "unknown" = "normal"
      if (stats.dry > 0 && stats.dry >= stats.total * 0.3) {
        status = "dry"
      } else if (stats.intermittent > 0 || stats.clusters > 0) {
        status = "intermittent"
      } else if (stats.total === 0 || stats.unknown === stats.total) {
        status = "unknown"
      }

      const avgPsi = stats.psiCount > 0 ? stats.psiSum / stats.psiCount : null

      results.push({
        name,
        totalBarangays: stats.total,
        normalCount: stats.normal,
        intermittentCount: stats.intermittent,
        dryCount: stats.dry,
        unknownCount: stats.unknown,
        totalClusters: stats.clusters,
        avgPsi,
        status,
      })
    })

    return results.sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <span>Interactive Municipal District Visualizer</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a district to isolate hydraulic telemetry and cluster triage queues across Iloilo City.
          </p>
        </div>

        {selectedDistrict !== "ALL" && (
          <button
            type="button"
            onClick={() => onSelectDistrict("ALL")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span>Reset to All Districts</span>
          </button>
        )}
      </div>

      {/* Grid of Interactive District Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {districtSummaries.map((dist) => {
          const isSelected = selectedDistrict === dist.name

          let statusBadgeClass = "bg-slate-100 text-slate-700 border-slate-200"
          let borderAccent = "border-slate-200/80 dark:border-slate-800"

          if (dist.status === "normal") {
            statusBadgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
            borderAccent = isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "hover:border-emerald-300"
          } else if (dist.status === "intermittent") {
            statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
            borderAccent = isSelected ? "border-amber-500 ring-2 ring-amber-500/20" : "hover:border-amber-300"
          } else if (dist.status === "dry") {
            statusBadgeClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
            borderAccent = isSelected ? "border-rose-500 ring-2 ring-rose-500/20" : "hover:border-rose-300"
          }

          return (
            <button
              key={dist.name}
              type="button"
              onClick={() => onSelectDistrict(isSelected ? "ALL" : dist.name)}
              className={`p-3.5 text-left rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 transition-all flex flex-col justify-between cursor-pointer ${borderAccent} ${
                isSelected ? "bg-white dark:bg-slate-800 shadow-xs" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                    {dist.name}
                  </h4>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusBadgeClass}`}>
                    {dist.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Monitored:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                      {dist.totalBarangays} barangays
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      Mean Pressure:
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {dist.avgPsi !== null ? `${dist.avgPsi.toFixed(1)} PSI` : "No reading"}
                    </span>
                  </div>

                  {dist.totalClusters > 0 && (
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
                      <span>Outage Clusters:</span>
                      <span>{dist.totalClusters} active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress mini-bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${dist.totalBarangays > 0 ? (dist.normalCount / dist.totalBarangays) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Normal: ${dist.normalCount}`}
                  />
                  <div
                    style={{ width: `${dist.totalBarangays > 0 ? (dist.intermittentCount / dist.totalBarangays) * 100 : 0}%` }}
                    className="bg-amber-500 h-full"
                    title={`Intermittent: ${dist.intermittentCount}`}
                  />
                  <div
                    style={{ width: `${dist.totalBarangays > 0 ? (dist.dryCount / dist.totalBarangays) * 100 : 0}%` }}
                    className="bg-rose-500 h-full"
                    title={`Dry: ${dist.dryCount}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{dist.normalCount} normal</span>
                  <span>{dist.dryCount > 0 ? `${dist.dryCount} dry` : "0 dry"}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
