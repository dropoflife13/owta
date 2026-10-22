"use client"

import React, { useState } from "react"
import {
  Truck,
  AlertOctagon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  MapPin,
  Users,
  AlertTriangle,
  Loader2,
  X,
  FileCheck2,
  ArrowRight,
  Flame,
} from "lucide-react"
import { dispatchTankerAction, updateDispatchStatusAction } from "@/app/staff/actions"

export interface ReliefQueueItem {
  cluster_id: string
  barangay_id: string
  barangay_name: string
  district_name: string
  category: string
  status: string
  report_count: number
  first_reported_at: string
  last_reported_at?: string | null
  dry_hours_elapsed: number
  relief_priority_tier: string
}

export interface ReliefDispatchItem {
  id: string
  barangay_id: string
  barangay_name?: string
  district_name?: string
  tanker_plate_number: string
  driver_name: string
  capacity_liters: number
  dispatched_at: string
  arrived_at?: string | null
  completed_at?: string | null
  status: string
  recipient_acknowledgment?: string | null
}

interface TankerFleetPreset {
  plateNumber: string
  driverName: string
  capacityLiters: number
  label: string
  owner: string
}

const TANKER_FLEET: TankerFleetPreset[] = [
  {
    plateNumber: "SGE-4011",
    driverName: "B. Alcantara",
    capacityLiters: 10000,
    label: "CDRRMO Tanker 01 (10,000L)",
    owner: "CDRRMO Quick Response Fleet",
  },
  {
    plateNumber: "SGE-4012",
    driverName: "E. Delgado",
    capacityLiters: 12000,
    label: "CDRRMO Tanker 02 (12,000L)",
    owner: "CDRRMO Quick Response Fleet",
  },
  {
    plateNumber: "BFP-6021",
    driverName: "SFO1 J. Ramos",
    capacityLiters: 15000,
    label: "BFP Rapid Relief 01 (15,000L)",
    owner: "Bureau of Fire Protection - Iloilo",
  },
  {
    plateNumber: "NCR-8820",
    driverName: "R. Villanueva",
    capacityLiters: 10000,
    label: "MPIW Auxiliary A (10,000L)",
    owner: "Metro Pacific Iloilo Water",
  },
  {
    plateNumber: "LG-5501",
    driverName: "M. Tan",
    capacityLiters: 8000,
    label: "City Hall General Tanker (8,000L)",
    owner: "Iloilo City General Services",
  },
]

interface ReliefPriorityMatrixProps {
  queue: ReliefQueueItem[]
  dispatches: ReliefDispatchItem[]
  userRole: string
}

export function ReliefPriorityMatrix({
  queue,
  dispatches,
  userRole,
}: ReliefPriorityMatrixProps) {
  const [activeTab, setActiveTab] = useState<"CRITICAL" | "ALL" | "DISPATCHES">("CRITICAL")
  const [selectedQueueItem, setSelectedQueueItem] = useState<ReliefQueueItem | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [dispatchError, setDispatchError] = useState<string | null>(null)

  // Tanker form state
  const [selectedFleetIdx, setSelectedFleetIdx] = useState<number>(0)
  const [customPlate, setCustomPlate] = useState<string>("")
  const [customDriver, setCustomDriver] = useState<string>("")
  const [customCapacity, setCustomCapacity] = useState<number>(10000)
  const [notes, setNotes] = useState<string>("")

  // Sign-off modal state for WR11
  const [signOffDispatchId, setSignOffDispatchId] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState<string>("")
  const [signOffLoading, setSignOffLoading] = useState<boolean>(false)

  // Strict sorting descending by dry hours (Rule WR06)
  const sortedQueue = [...queue].sort((a, b) => b.dry_hours_elapsed - a.dry_hours_elapsed)

  // Filter queues
  const criticalItems = sortedQueue.filter((item) => item.dry_hours_elapsed >= 48)
  const displayedItems = activeTab === "CRITICAL" ? criticalItems : sortedQueue

  // Metrics
  const criticalCount = criticalItems.length
  const elevatedCount = sortedQueue.filter(
    (item) => item.dry_hours_elapsed >= 24 && item.dry_hours_elapsed < 48
  ).length
  const inTransitCount = dispatches.filter(
    (d) => d.status === "in_transit" || d.status === "on_site"
  ).length
  const totalDeliveredLiters = dispatches
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + (d.capacity_liters || 0), 0)

  // Format timestamp in Asia/Manila
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—"
    try {
      const d = new Date(isoString)
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d)
    } catch {
      return isoString
    }
  }

  const handleOpenDispatchModal = (item: ReliefQueueItem) => {
    setSelectedQueueItem(item)
    setSelectedFleetIdx(0)
    setNotes("")
    setDispatchError(null)
  }

  const handleCloseModal = () => {
    setSelectedQueueItem(null)
    setDispatchError(null)
  }

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQueueItem) return

    setSubmitting(true)
    setDispatchError(null)

    const isCustom = selectedFleetIdx === -1
    const plate = isCustom ? customPlate : TANKER_FLEET[selectedFleetIdx]?.plateNumber
    const driver = isCustom ? customDriver : TANKER_FLEET[selectedFleetIdx]?.driverName
    const capacity = isCustom
      ? customCapacity
      : TANKER_FLEET[selectedFleetIdx]?.capacityLiters || 10000

    const formData = new FormData()
    formData.append("barangayId", selectedQueueItem.barangay_id)
    formData.append("clusterId", selectedQueueItem.cluster_id)
    formData.append("tankerPlateNumber", plate)
    formData.append("driverName", driver)
    formData.append("capacityLiters", capacity.toString())
    formData.append("notes", notes)

    try {
      const res = await dispatchTankerAction(formData)
      if (res?.error) {
        setDispatchError(res.error)
      } else {
        handleCloseModal()
        setActiveTab("DISPATCHES")
      }
    } catch (err: any) {
      setDispatchError(err.message || "An unexpected error occurred during dispatch.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (
    dispatchId: string,
    nextStatus: string,
    recipientAck?: string
  ) => {
    const formData = new FormData()
    formData.append("dispatchId", dispatchId)
    formData.append("status", nextStatus)
    if (recipientAck) formData.append("recipientAcknowledgment", recipientAck)

    try {
      const res = await updateDispatchStatusAction(formData)
      if (res?.error) {
        alert(`Error updating dispatch: ${res.error}`)
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`)
    }
  }

  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signOffDispatchId || !recipientName.trim()) return

    setSignOffLoading(true)
    try {
      await handleUpdateStatus(
        signOffDispatchId,
        "completed",
        `Verified receipt signed by: ${recipientName.trim()}`
      )
      setSignOffDispatchId(null)
      setRecipientName("")
    } finally {
      setSignOffLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Rules Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              LGU Relief Priority Matrix
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              CDRRMO Fleet Dispatch
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            City-wide automated triage ranking for emergency potable water rationing (Rule WR06 &amp; WR10).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Rule WR06 Active (&ge; 48h)</span>
          </div>
        </div>
      </div>

      {/* WR06 Methodology Notice Banner */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Evidence-Based Municipal Resource Allocation</p>
          <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Pursuant to City Executive Directives, relief tankers are dispatched strictly according to verified mathematical duration of waterlessness rather than arbitrary requests. A barangay enters the priority queue only when verified dry tap duration reaches or exceeds <strong>48 consecutive hours</strong>. Stale or unknown telemetry never triggers relief.
          </p>
        </div>
      </div>

      {/* KPI Matrix Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Critical &ge; 48h
            </span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{criticalCount}</p>
          <span className="text-[10px] text-zinc-400">Immediate Rationing Priority</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Elevated (&ge; 24h)
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{elevatedCount}</p>
          <span className="text-[10px] text-zinc-400">Pre-Staging Alert</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Tankers on Mission
            </span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">{inTransitCount}</p>
          <span className="text-[10px] text-zinc-400">In Transit or On Site</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Relief Delivered
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {totalDeliveredLiters.toLocaleString()} L
          </p>
          <span className="text-[10px] text-zinc-400">Verified Recipient Sign-off</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("CRITICAL")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "CRITICAL"
              ? "border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Critical 48h+ Priority ({criticalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("ALL")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "ALL"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>All Outage Queues ({sortedQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("DISPATCHES")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "DISPATCHES"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Active Fleet Dispatches ({dispatches.length})</span>
        </button>
      </div>

      {/* View Content */}
      {activeTab !== "DISPATCHES" ? (
        <div className="space-y-3">
          {displayedItems.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                No Barangays Exceed the Relief Threshold
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeTab === "CRITICAL"
                  ? "Zero barangays currently have continuous verified dry taps >= 48 hours."
                  : "Zero unaddressed report clusters currently recorded in the queue."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedItems.map((item, index) => {
                const isCritical = item.dry_hours_elapsed >= 48
                const isElevated = item.dry_hours_elapsed >= 24 && item.dry_hours_elapsed < 48

                return (
                  <div
                    key={item.cluster_id}
                    className={`bg-white dark:bg-zinc-900 p-5 rounded-xl border shadow-xs transition-colors space-y-4 ${
                      isCritical
                        ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/10"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                            isCritical
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          #{index + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50">
                              Barangay {item.barangay_name}
                            </h2>
                            <span className="text-xs text-zinc-400">•</span>
                            <span className="text-xs text-zinc-500">{item.district_name}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            Cluster ID: {item.cluster_id.slice(0, 8)}... • Category: {item.category.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      {/* Tier Badge */}
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                            <Flame className="w-3.5 h-3.5 text-rose-600" />
                            Critical 48h+ Tier (WR10)
                          </span>
                        ) : isElevated ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Elevated Relief Tier
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Standard Queue
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Telemetry Metrics & Cluster Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                        <span className="text-zinc-400 font-medium">Consecutive Dry Hours:</span>
                        <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          {item.dry_hours_elapsed}h
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                        <span className="text-zinc-400 font-medium">Clustered Incidents:</span>
                        <p className="text-xl font-black text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          {item.report_count} Reports
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                        <span className="text-zinc-400 font-medium">First Reported:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                          {formatTime(item.first_reported_at)}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                        <span className="text-zinc-400 font-medium">Status / Verification:</span>
                        <p className="font-bold capitalize text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.status}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[11px] text-zinc-400">
                        Priority Rank calculated per WR06 methodology descending.
                      </p>

                      <button
                        onClick={() => handleOpenDispatchModal(item)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Dispatch Tanker</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Dispatches View */
        <div className="space-y-3">
          {dispatches.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <Truck className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Dispatches Recorded</p>
              <p className="text-xs text-zinc-500 mt-1">
                Dispatch an emergency tanker from the Priority Queue tab to track deployment here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dispatches.map((dispatch) => {
                const isInTransit = dispatch.status === "in_transit"
                const isOnSite = dispatch.status === "on_site"
                const isCompleted = dispatch.status === "completed"

                return (
                  <div
                    key={dispatch.id}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                          <Truck className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-50">
                              {dispatch.tanker_plate_number}
                            </span>
                            <span className="text-xs text-zinc-400">•</span>
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              Driver: {dispatch.driver_name}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Target Zone: Barangay {dispatch.barangay_name || "Assigned Zone"} ({dispatch.district_name || "Iloilo City"})
                          </p>
                        </div>
                      </div>

                      {/* Status Lifecycle Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isOnSite
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}
                        >
                          {dispatch.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-400 font-medium">Capacity:</span>
                        <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {dispatch.capacity_liters.toLocaleString()} Liters
                        </p>
                      </div>

                      <div>
                        <span className="text-zinc-400 font-medium">Dispatched At:</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatTime(dispatch.dispatched_at)}
                        </p>
                      </div>

                      <div>
                        <span className="text-zinc-400 font-medium">Arrived On Site:</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatTime(dispatch.arrived_at)}
                        </p>
                      </div>

                      <div>
                        <span className="text-zinc-400 font-medium">Completed &amp; Signed:</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatTime(dispatch.completed_at)}
                        </p>
                      </div>
                    </div>

                    {/* Recipient Acknowledgment Banner (Rule WR11) */}
                    {dispatch.recipient_acknowledgment && (
                      <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Rule WR11 Verification:</strong> {dispatch.recipient_acknowledgment}
                        </span>
                      </div>
                    )}

                    {/* Dispatch Lifecycle Actions */}
                    {!isCompleted && (
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                        {isInTransit && (
                          <button
                            onClick={() => handleUpdateStatus(dispatch.id, "on_site")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mark On Site</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSignOffDispatchId(dispatch.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Complete &amp; Record Sign-off (WR11)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tanker Dispatch Assignment Modal */}
      {selectedQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    Dispatch Potable Relief Tanker
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Target: Barangay {selectedQueueItem.barangay_name} ({selectedQueueItem.district_name})
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dry Hours Alert Header */}
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Verified Outage Duration:</span>
                <p className="text-lg font-black text-rose-700 dark:text-rose-300">
                  {selectedQueueItem.dry_hours_elapsed} Hours Elapsed
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-rose-600">Priority Tier</span>
                <p className="font-black text-xs text-rose-800 dark:text-rose-300">
                  {selectedQueueItem.relief_priority_tier}
                </p>
              </div>
            </div>

            {dispatchError && (
              <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{dispatchError}</span>
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Select Active Municipal Fleet Tanker
                </label>
                <select
                  value={selectedFleetIdx}
                  onChange={(e) => setSelectedFleetIdx(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {TANKER_FLEET.map((fleet, idx) => (
                    <option key={fleet.plateNumber} value={idx}>
                      {fleet.label} • Plate: {fleet.plateNumber} • Driver: {fleet.driverName}
                    </option>
                  ))}
                  <option value={-1}>+ Enter Custom Auxiliary Tanker Details</option>
                </select>
              </div>

              {selectedFleetIdx === -1 && (
                <div className="space-y-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Tanker Plate Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SGE-9999"
                      value={customPlate}
                      onChange={(e) => setCustomPlate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Driver Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Juan dela Cruz"
                        value={customDriver}
                        onChange={(e) => setCustomDriver(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Capacity (Liters)
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        step={500}
                        value={customCapacity}
                        onChange={(e) => setCustomCapacity(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Dispatch Notes / Rendezvous Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Staging in front of Barangay Hall / Daycare Center"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" />
                      <span>Authorize &amp; Dispatch Tanker</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipient Sign-Off Modal (Rule WR11) */}
      {signOffDispatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Closed-Loop Verification Sign-off (WR11)
                </h3>
              </div>
              <button
                onClick={() => setSignOffDispatchId(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Pursuant to Rule WR11, every emergency potable water delivery requires affirmative on-site sign-off from a barangay representative or recipient focal person before closing the dispatch lifecycle.
            </p>

            <form onSubmit={handleSignOffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Recipient Name &amp; Designation / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kagawad R. Gomez (Water Committee) or Resident Rep"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSignOffDispatchId(null)}
                  className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={signOffLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {signOffLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Receipt &amp; Complete Mission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

