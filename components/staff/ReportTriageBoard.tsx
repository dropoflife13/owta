"use client"

import React, { useState } from "react"
import {
  ClipboardCheck,
  AlertOctagon,
  AlertTriangle,
  Droplet,
  Waves,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  Search,
  Users,
} from "lucide-react"
import { updateReportTriageAction } from "@/app/staff/actions"

export interface TriageReportItem {
  id: string
  ticket_token: string
  cluster_id: string | null
  barangay_id: string
  barangay_name: string
  district_name: string
  category: string
  description?: string | null
  landmark?: string | null
  status: string
  cluster_count: number
  created_at: string
  verified_at?: string | null
}

interface ReportTriageBoardProps {
  reports: TriageReportItem[]
  assignedBarangayName?: string | null
  userRole: string
}

export function ReportTriageBoard({
  reports,
  assignedBarangayName,
  userRole,
}: ReportTriageBoardProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [search, setSearch] = useState<string>("")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})

  // Metrics
  const totalReports = reports.length
  const pendingCount = reports.filter((r) => r.status === "submitted").length
  const verifiedCount = reports.filter((r) => r.status === "verified").length
  const resolvedCount = reports.filter((r) => r.status === "resolved").length

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesStatus =
      filterStatus === "ALL" || r.status.toLowerCase() === filterStatus.toLowerCase()

    const matchesSearch =
      r.ticket_token.toLowerCase().includes(search.toLowerCase()) ||
      r.barangay_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.landmark && r.landmark.toLowerCase().includes(search.toLowerCase())) ||
      r.category.toLowerCase().includes(search.toLowerCase())

    return matchesStatus && matchesSearch
  })

  // Format time in Asia/Manila
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

  const handleTriageSubmit = async (
    reportId: string,
    clusterId: string | null,
    newStatus: string
  ) => {
    setLoadingId(reportId)
    const formData = new FormData()
    formData.append("reportId", reportId)
    if (clusterId) formData.append("clusterId", clusterId)
    formData.append("status", newStatus)
    formData.append("notes", actionNotes[reportId] || "")

    try {
      const res = await updateReportTriageAction(formData)
      if (res?.error) {
        alert(`Error updating report: ${res.error}`)
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`)
    } finally {
      setLoadingId(null)
    }
  }

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case "dry_tap":
        return <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
      case "low_pressure":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      case "dirty_water":
        return <Droplet className="w-4 h-4 text-yellow-600 shrink-0" />
      case "pipe_burst":
        return <Waves className="w-4 h-4 text-blue-500 shrink-0" />
      default:
        return <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Incident Verification & Triage
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {userRole === "barangay_official"
              ? `Authorized scope: ${assignedBarangayName || "Assigned Barangay"} (Rule WR06)`
              : "Authorized scope: Citywide Operational View"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RLS Enforced</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Reports</span>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{totalReports}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending Triage
          </span>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Verified
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{verifiedCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Resolved
          </span>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket code, landmark, or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "ALL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setFilterStatus("submitted")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "submitted"
                ? "bg-amber-600 text-white"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("verified")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "verified"
                ? "bg-emerald-600 text-white"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setFilterStatus("resolved")}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === "resolved"
                ? "bg-blue-600 text-white"
                : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <ClipboardCheck className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No reports found</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {reports.length === 0
              ? "Zero active incidents have been reported in your barangay."
              : "No reports match the current filter selection."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isLoading = loadingId === report.id
            const isVerified = report.status === "verified"
            const isPending = report.status === "submitted"

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4"
              >
                {/* Header: Token, Category, Cluster Count */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    {renderCategoryIcon(report.category)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {report.ticket_token}
                        </span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                          {report.category.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {report.barangay_name} ({report.district_name})
                      </p>
                    </div>
                  </div>

                  {/* Status & Cluster Badges */}
                  <div className="flex items-center gap-2">
                    {report.cluster_count > 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        <Users className="w-3 h-3" />
                        {report.cluster_count} Nearby Reports (WR05)
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : isPending
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                </div>

                {/* Body: Landmark & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 font-medium">Reported Landmark:</span>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {report.landmark || "No specific landmark entered"}
                    </p>
                  </div>

                  {report.description && (
                    <div>
                      <span className="text-zinc-400 font-medium">Citizen Notes:</span>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">{report.description}</p>
                    </div>
                  )}

                  <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Submitted: {formatTime(report.created_at)}
                  </div>

                  {report.verified_at && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified: {formatTime(report.verified_at)}
                    </div>
                  )}
                </div>

                {/* Triage Action Panel */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2 items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                  <input
                    type="text"
                    placeholder="Field verification notes (optional)..."
                    value={actionNotes[report.id] || ""}
                    onChange={(e) =>
                      setActionNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Verify Action */}
                    {!isVerified && (
                      <button
                        onClick={() => handleTriageSubmit(report.id, report.cluster_id, "verified")}
                        disabled={isLoading}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Verify Incident</span>
                      </button>
                    )}

                    {/* Reject Action */}
                    {report.status !== "rejected" && (
                      <button
                        onClick={() => handleTriageSubmit(report.id, report.cluster_id, "rejected")}
                        disabled={isLoading}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Resolve Action */}
                    {isVerified && report.status !== "resolved" && (
                      <button
                        onClick={() => handleTriageSubmit(report.id, report.cluster_id, "resolved")}
                        disabled={isLoading}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Droplet className="w-3.5 h-3.5" />
                        <span>Mark Restored</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

