"use client"

import React, { useState } from "react"
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  History,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Plus,
  X,
  FileEdit,
  ArrowRight,
} from "lucide-react"
import { publishScheduleAction, supersedeScheduleAction } from "@/app/staff/actions"

export interface DmaZoneItem {
  id: string
  code: string
  name: string
  description?: string | null
}

export interface WaterScheduleItem {
  id: string
  dma_zone_id: string
  dma_name: string
  dma_code: string
  window_start: string
  window_end: string
  published_by?: string | null
  published_at: string
  superseded_at?: string | null
  superseded_by_id?: string | null
  notes?: string | null
}

interface ScheduleEditorProps {
  dmaZones: DmaZoneItem[]
  schedules: WaterScheduleItem[]
  userRole: string
}

export function ScheduleEditor({
  dmaZones,
  schedules,
  userRole,
}: ScheduleEditorProps) {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "SUPERSEDED">("ACTIVE")

  // Publish Form State
  const [selectedDmaId, setSelectedDmaId] = useState<string>(
    dmaZones[0]?.id || "d0000000-0000-0000-0000-000000000001"
  )
  const [windowStart, setWindowStart] = useState<string>("")
  const [windowEnd, setWindowEnd] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [publishing, setPublishing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Supersede Modal State
  const [supersedeTarget, setSupersedeTarget] = useState<WaterScheduleItem | null>(null)
  const [newWindowStart, setNewWindowStart] = useState<string>("")
  const [newWindowEnd, setNewWindowEnd] = useState<string>("")
  const [supersedeNotes, setSupersedeNotes] = useState<string>("")
  const [superseding, setSuperseding] = useState<boolean>(false)
  const [supersedeError, setSupersedeError] = useState<string | null>(null)

  // Filter schedules
  const activeSchedules = schedules.filter((s) => !s.superseded_at)
  const supersededSchedules = schedules.filter((s) => !!s.superseded_at)

  // Format time in Asia/Manila
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "—"
    try {
      const d = new Date(isoString)
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d)
    } catch {
      return isoString
    }
  }

  // Calculate duration in hours
  const calculateHours = (startIso: string, endIso: string) => {
    const start = new Date(startIso).getTime()
    const end = new Date(endIso).getTime()
    if (isNaN(start) || isNaN(end)) return 0
    return ((end - start) / 3600000).toFixed(1)
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublishing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData()
    formData.append("dmaZoneId", selectedDmaId)
    formData.append("windowStart", new Date(windowStart).toISOString())
    formData.append("windowEnd", new Date(windowEnd).toISOString())
    formData.append("notes", notes)

    try {
      const res = await publishScheduleAction(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage("Water supply schedule successfully published and committed to audit trail!")
        setWindowStart("")
        setWindowEnd("")
        setNotes("")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while publishing.")
    } finally {
      setPublishing(false)
    }
  }

  const handleOpenSupersede = (item: WaterScheduleItem) => {
    setSupersedeTarget(item)
    setNewWindowStart("")
    setNewWindowEnd("")
    setSupersedeNotes("")
    setSupersedeError(null)
  }

  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supersedeTarget) return

    setSuperseding(true)
    setSupersedeError(null)

    const formData = new FormData()
    formData.append("oldScheduleId", supersedeTarget.id)
    formData.append("dmaZoneId", supersedeTarget.dma_zone_id)
    formData.append("windowStart", new Date(newWindowStart).toISOString())
    formData.append("windowEnd", new Date(newWindowEnd).toISOString())
    formData.append("notes", supersedeNotes)

    try {
      const res = await supersedeScheduleAction(formData)
      if (res?.error) {
        setSupersedeError(res.error)
      } else {
        setSupersedeTarget(null)
        setSuccessMessage("Schedule successfully superseded with new active operational window (Rule WR01)!")
      }
    } catch (err: any) {
      setSupersedeError(err.message || "An error occurred while superseding schedule.")
    } finally {
      setSuperseding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Rotational Supply Schedule Publisher
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              Utility Operations Desk
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Publish, adjust, and supersede rotational district metering supply schedules (Rule WR01).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>GiST Overlap Guard (WR01)</span>
          </div>
        </div>
      </div>

      {/* WR01 Rule Clarification Notice */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Rule WR01: Non-Overlapping Rotational Supply Windows</p>
          <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Every published schedule window for a DMA must be distinct and non-overlapping. Overlapping windows are automatically rejected by the database exclusion check. If operational conditions require modifying an active supply window, use <strong>Supersede Window</strong> to preserve an unalterable audit trail for the public Delivery Index.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Published</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{schedules.length}</p>
          <span className="text-[10px] text-zinc-400">All DMA Records</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Active Windows
          </span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{activeSchedules.length}</p>
          <span className="text-[10px] text-zinc-400">Currently Effective</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Superseded
          </span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
            {supersededSchedules.length}
          </p>
          <span className="text-[10px] text-zinc-400">Replaced via WR01</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Managed DMAs</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{dmaZones.length}</p>
          <span className="text-[10px] text-zinc-400">Coverage Zones</span>
        </div>
      </div>

      {/* Schedule Publisher Form */}
      <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Publish New Rotational Supply Window
          </h2>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target DMA Zone
              </label>
              <select
                value={selectedDmaId}
                onChange={(e) => setSelectedDmaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dmaZones.map((dma) => (
                  <option key={dma.id} value={dma.id}>
                    {dma.code} — {dma.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Window Start (Pressurization)
              </label>
              <input
                type="datetime-local"
                required
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Window End (Depressurization)
              </label>
              <input
                type="datetime-local"
                required
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Operational Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Standard 6-hour evening rotational supply window"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-xs disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating Constraints...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Publish Schedule Window</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Schedule Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "ACTIVE"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Active Published Schedules ({activeSchedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SUPERSEDED")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "SUPERSEDED"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Superseded Audit Log ({supersededSchedules.length})</span>
        </button>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {(activeTab === "ACTIVE" ? activeSchedules : supersededSchedules).length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Calendar className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {activeTab === "ACTIVE" ? "No Active Schedules Published" : "No Superseded Schedules Recorded"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Use the publisher above to register rotational water supply windows for DMA zones.
            </p>
          </div>
        ) : (
          (activeTab === "ACTIVE" ? activeSchedules : supersededSchedules).map((sched) => {
            const hours = calculateHours(sched.window_start, sched.window_end)
            const isSuperseded = Boolean(sched.superseded_at)

            return (
              <div
                key={sched.id}
                className={`bg-white dark:bg-zinc-900 p-5 rounded-xl border shadow-xs space-y-4 ${
                  isSuperseded
                    ? "border-zinc-200 dark:border-zinc-800 opacity-75"
                    : "border-blue-200/80 dark:border-blue-900/40"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                        isSuperseded
                          ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {sched.dma_code}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {sched.dma_name}
                        </h3>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {hours} Scheduled Hours
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {sched.notes || "Standard rotational supply window"}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isSuperseded ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        <History className="w-3.5 h-3.5" />
                        Superseded on {formatDateTime(sched.superseded_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Active Window (WR01)
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                    <span className="text-zinc-400 font-medium">Window Start:</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateTime(sched.window_start)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                    <span className="text-zinc-400 font-medium">Window End:</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {formatDateTime(sched.window_end)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                    <span className="text-zinc-400 font-medium">Published At:</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {formatDateTime(sched.published_at)}
                    </p>
                  </div>
                </div>

                {/* Supersede Action */}
                {!isSuperseded && (
                  <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[11px] text-zinc-400">
                      Need to adjust hours? Superseding creates an unbroken audit trail.
                    </p>

                    <button
                      onClick={() => handleOpenSupersede(sched)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-blue-600" />
                      <span>Supersede Window</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Supersede Modal */}
      {supersedeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Supersede Supply Schedule (Rule WR01)
                </h3>
              </div>
              <button
                onClick={() => setSupersedeTarget(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Modifying an active schedule for <strong>{supersedeTarget.dma_name}</strong> will supersede the current window ({formatDateTime(supersedeTarget.window_start)} - {formatDateTime(supersedeTarget.window_end)}) and publish a replacement.
            </p>

            {supersedeError && (
              <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{supersedeError}</span>
              </div>
            )}

            <form onSubmit={handleSupersedeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    New Window Start
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newWindowStart}
                    onChange={(e) => setNewWindowStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    New Window End
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newWindowEnd}
                    onChange={(e) => setNewWindowEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upstream bulk water treatment plant delay"
                  value={supersedeNotes}
                  onChange={(e) => setSupersedeNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSupersedeTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={superseding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {superseding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Superseding Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

