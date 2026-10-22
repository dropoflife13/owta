"use client"

import React, { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { BarChart3, Gauge, PieChart as PieIcon, ShieldAlert, Info } from "lucide-react"
import { BarangayStatusItem } from "./BarangayStatusBoard"

interface CitywideAnalyticsChartsProps {
  items: BarangayStatusItem[]
}

export function CitywideAnalyticsCharts({ items }: CitywideAnalyticsChartsProps) {
  // Aggregate district mean pressure
  const districtPressureData = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()

    const defaultDistricts = [
      "City Proper",
      "Jaro",
      "Molo",
      "Mandurriao",
      "La Paz",
      "Lapuz",
      "Villa Arevalo",
    ]

    defaultDistricts.forEach((d) => map.set(d, { sum: 0, count: 0 }))

    items.forEach((item) => {
      const dName = item.district_name || "Mandurriao"
      let record = map.get(dName)
      if (!record) {
        record = { sum: 0, count: 0 }
        map.set(dName, record)
      }
      if (item.latest_psi !== null && item.latest_psi !== undefined) {
        record.sum += Number(item.latest_psi)
        record.count += 1
      }
    })

    const data: { district: string; psi: number; count: number }[] = []
    map.forEach((record, district) => {
      const psi = record.count > 0 ? Number((record.sum / record.count).toFixed(1)) : 0
      data.push({
        district: district.replace("Villa ", ""),
        psi,
        count: record.count,
      })
    })

    return data.sort((a, b) => b.psi - a.psi)
  }, [items])

  // Aggregate supply status distribution
  const supplyStatusData = useMemo(() => {
    let normal = 0
    let intermittent = 0
    let dry = 0
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
      } else {
        unknown++
      }
    })

    return [
      { name: "Normal Supply (≥7 PSI)", value: normal, color: "#10B981" },
      { name: "Low / Intermittent", value: intermittent, color: "#F59E0B" },
      { name: "Critical Dry Outage", value: dry, color: "#EF4444" },
    ].filter((d) => d.value > 0)
  }, [items])

  const totalMonitored = items.length

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50">
              Municipal Hydraulic Telemetry Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparative hydraulic pressure and service distribution across Iloilo City water districts.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono">
          <Gauge className="w-3.5 h-3.5 text-sky-600" />
          <span>Compliance Baseline: 7.00 PSI</span>
        </div>
      </div>

      {/* Two Column Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Chart 1: District Pressure Comparison (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Mean District Pressure (PSI)
              </h4>
              <p className="text-[11px] text-slate-400">
                Red dashed line marks the 7.0 PSI municipal standard floor
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={districtPressureData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="district"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  domain={[0, 20]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-xl bg-slate-900 text-white p-3 shadow-lg text-xs space-y-1 border border-slate-800">
                          <p className="font-bold">{data.district}</p>
                          <p className="font-mono text-sky-400">
                            Mean Pressure: {data.psi} PSI
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {data.psi >= 7.0 ? "✓ Meets 7.0 PSI standard" : "⚠ Below standard operating floor"}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine
                  y={7.0}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "7.0 PSI Floor",
                    position: "insideTopRight",
                    fill: "#EF4444",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="psi" radius={[6, 6, 0, 0]}>
                  {districtPressureData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.psi >= 7.0 ? "#0284C7" : entry.psi >= 4.0 ? "#F59E0B" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Supply Continuity Donut (1 col) */}
        <div className="space-y-4 lg:border-l lg:border-slate-100 dark:lg:border-slate-800 lg:pl-8">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Citywide Service Continuity
            </h4>
            <p className="text-[11px] text-slate-400">
              Percentage of {totalMonitored} barangays by operational state
            </p>
          </div>

          <div className="h-48 sm:h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={supplyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {supplyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const pct = totalMonitored > 0 ? Math.round((data.value / totalMonitored) * 100) : 0
                      return (
                        <div className="rounded-xl bg-slate-900 text-white p-2.5 shadow-lg text-xs space-y-0.5 border border-slate-800">
                          <p className="font-semibold">{data.name}</p>
                          <p className="font-mono text-sky-400">
                            {data.value} Barangays ({pct}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {supplyStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {item.value} ({totalMonitored > 0 ? Math.round((item.value / totalMonitored) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
