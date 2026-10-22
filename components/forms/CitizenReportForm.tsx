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
    sub: "No water flowing at all",
    icon: AlertOctagon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60",
    activeRing: "ring-2 ring-red-500",
  },
  {
    id: "low_pressure",
    label: "Low Pressure",
    sub: "Trickle or weak tap pressure",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    activeRing: "ring-2 ring-amber-500",
  },
  {
    id: "dirty_water",
    label: "Discolored Water",
    sub: "Brown, turbid, or smelly water",
    icon: Droplet,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900/60",
    activeRing: "ring-2 ring-yellow-500",
  },
  {
    id: "pipe_burst",
    label: "Pipe Burst",
    sub: "Visible leak or gushing pipe",
    icon: Waves,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
    activeRing: "ring-2 ring-blue-500",
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
      setErrorMessage("Please enter a recognizable landmark (at least 3 characters).")
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
      <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200 dark:border-zinc-700/80">
        <button
          type="button"
          onClick={() => setActiveTab("submit")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "submit"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Submit New Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("track")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === "track"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Track Existing Ticket
        </button>
      </div>

      {/* TRACK EXISTING TICKET TAB */}
      {activeTab === "track" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Track Outage Ticket</h2>
            <p className="text-xs text-zinc-500">
              Enter the 8-character reference token you received upon submitting your report (e.g. <code>OWTA-7B29M</code>).
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-3">
            <div>
              <label htmlFor="trackCode" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Ticket Reference Token
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="trackCode"
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  placeholder="OWTA-XXXXXX"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
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
          className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5"
        >
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
              1. What issue are you experiencing?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between ${
                      cat.bg
                    } ${isSelected ? cat.activeRing + " border-transparent" : "border-zinc-200 dark:border-zinc-800 opacity-80"}`}
                  >
                    <Icon className={`w-5 h-5 ${cat.color} mb-1.5`} />
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cat.label}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{cat.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Barangay Selection */}
          <div className="space-y-1.5">
            <label htmlFor="barangay" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
              2. Select Your Barangay
            </label>
            <select
              id="barangay"
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
              className="w-full text-sm py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              required
            >
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district_name || "Iloilo City"})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Landmark & Location */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="landmark" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                3. Street or Landmark
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
              >
                {geoLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Navigation className="w-3 h-3" />
                )}
                <span>{coords ? "Location Attached ✓" : "Attach GPS Pin"}</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Corner Delgado St, near Plaza Fountain"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            {coords && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> GPS coordinates snapped ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}). Exact pin is kept staff-only (Rule WR07).
              </p>
            )}
          </div>

          {/* 4. Optional Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
              4. Operational Notes (Optional)
            </label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Pressure dropped suddenly around 6:30 AM"
              className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={1000}
            />
          </div>

          {/* 5. Optional Phone & RA 10173 Consent Checkbox */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
            <div className="space-y-1">
              <label htmlFor="phone" className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Resolution Updates via Mobile (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Consent Toggle (Rule WR09) */}
            <label className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="leading-snug">
                I explicitly consent to the temporary storage of my Philippine mobile number solely for receiving status
                updates regarding this water outage pursuant to <strong className="text-zinc-800 dark:text-zinc-200">Republic Act No. 10173 (Data Privacy Act of 2012)</strong>. Numbers are auto-purged after 30 days.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Outage Incident...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Outage Report</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
