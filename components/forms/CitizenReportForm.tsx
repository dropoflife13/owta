"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertOctagon,
  AlertTriangle,
  Droplet,
  Waves,
  MapPin,
  Phone,
  ShieldCheck,
  Search,
  CheckCircle2,
  Loader2,
  Navigation,
  ExternalLink,
} from "lucide-react"

export interface BarangayOption {
  id: string
  name: string
  district_name?: string
  code?: string
}

interface CitizenReportFormProps {
  barangays: BarangayOption[]
}

const CATEGORIES = [
  {
    id: "dry_tap",
    label: "Dry Tap",
    sub: "Zero pressure, completely dry tap",
    icon: AlertOctagon,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50",
    activeRing: "ring-2 ring-rose-500 border-rose-500",
  },
  {
    id: "low_pressure",
    label: "Low Pressure",
    sub: "Trickle, degraded or erratic pressure",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50",
    activeRing: "ring-2 ring-amber-500 border-amber-500",
  },
  {
    id: "dirty_water",
    label: "Discolored Water",
    sub: "Brown, turbid, smelly or rusty water",
    icon: Droplet,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50/80 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50",
    activeRing: "ring-2 ring-yellow-500 border-yellow-500",
  },
  {
    id: "pipe_burst",
    label: "Pipe Burst / Leak",
    sub: "Visible main leak or gushing water",
    icon: Waves,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50/80 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50",
    activeRing: "ring-2 ring-sky-500 border-sky-500",
  },
]

export function CitizenReportForm({ barangays }: CitizenReportFormProps) {
  const router = useRouter()

  // Form State
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit")
  const [barangayId, setBarangayId] = useState<string>(barangays[0]?.id || "")
  const [category, setCategory] = useState<string>("dry_tap")
  const [landmark, setLandmark] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [phone, setPhone] = useState<string>("")
  const [consent, setConsent] = useState<boolean>(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState<boolean>(false)

  // Tracking tab state
  const [trackCode, setTrackCode] = useState<string>("")

  // UI state
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setGeoLoading(false)
      },
      (err) => {
        console.warn("Geolocation denied or failed:", err.message)
        setGeoLoading(false)
      },
      { timeout: 10000 }
    )
  }

  // Handle Submit Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!barangayId) {
      setErrorMessage("Please select your barangay.")
      return
    }
    if (!landmark || landmark.trim().length < 3) {
      setErrorMessage("Please enter a recognizable landmark or street name (at least 3 characters).")
      return
    }
    if (phone && phone.trim() !== "" && !consent) {
      setErrorMessage("You must check the consent box if providing a phone number pursuant to RA 10173.")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangay_id: barangayId,
          category,
          landmark: landmark.trim(),
          description: description.trim() || null,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          contact_number: phone.trim() || null,
          consent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(
          data.details ? data.details.join(", ") : data.error || "Failed to submit outage report."
        )
        setSubmitting(false)
        return
      }

      // Success: redirect to ticket view
      if (data.ticket_token) {
        router.push(`/report/${encodeURIComponent(data.ticket_token)}`)
      } else {
        setErrorMessage("Report recorded, but no ticket code returned.")
        setSubmitting(false)
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error. Please try again.")
      setSubmitting(false)
    }
  }

  // Handle Track Code Submit
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackCode.trim()) return
    const code = trackCode.trim().toUpperCase()
    router.push(`/report/${encodeURIComponent(code)}`)
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Mode Navigation Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab("submit")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "submit"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Submit New Outage Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("track")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "track"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Track Existing Ticket
        </button>
      </div>

      {/* TRACK EXISTING TICKET TAB */}
      {activeTab === "track" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">Track Outage Ticket</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the anonymous reference token you received upon filing (e.g. <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">OWTA-7B29M</code>).
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div>
              <label htmlFor="trackCode" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Ticket Token
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="trackCode"
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  placeholder="OWTA-XXXXXX"
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-xs"
            >
              Check Incident Status
            </button>
          </form>
        </div>
      )}

      {/* SUBMIT NEW OUTAGE REPORT TAB */}
      {activeTab === "submit" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5"
        >
          {errorMessage && (
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. What issue are you experiencing? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 text-left rounded-xl border transition-colors flex items-start gap-3 min-h-[48px] ${
                      cat.bg
                    } ${isSelected ? cat.activeRing : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}
                  >
                    <Icon className={`w-5 h-5 ${cat.color} shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{cat.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{cat.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Barangay Selection */}
          <div className="space-y-1.5">
            <label htmlFor="barangay" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Select Your Barangay <span className="text-rose-500">*</span>
            </label>
            <select
              id="barangay"
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
              className="w-full text-sm py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-medium cursor-pointer"
              required
            >
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district_name})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Landmark / Approximate Location (Zero PII - Rule WR07) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="landmark" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Nearest Landmark or Street <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-800 disabled:opacity-50"
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>{coords ? "Location Attached ✓" : "Use GPS Pin"}</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                id="landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Mandurriao Plaza, Corner Guzman St (no house numbers)"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              For privacy (Rule WR07), do not provide exact residential house numbers. Mention street corners or landmarks.
            </p>
          </div>

          {/* 4. Optional Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4. Additional Details <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water stopped at 6:00 AM, affecting around 20 households in our purok."
              className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>

          {/* 5. Optional Phone for SMS Notifications (RA 10173 Consent) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <span>SMS Status Updates (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Receive an automatic SMS notification when your outage cluster is verified or a relief tanker is dispatched.
              </p>
            </div>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917XXXXXXX"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono"
            />

            {phone.trim() !== "" && (
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  required={phone.trim() !== ""}
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  I consent to OWTA storing my mobile number solely for incident resolution updates, pursuant to the{" "}
                  <strong>Philippine Data Privacy Act of 2012 (RA 10173)</strong>. Numbers are cryptographically hashed and purged once resolved.
                </span>
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Incident & Clustering...</span>
              </>
            ) : (
              <span>Submit Outage Report</span>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
