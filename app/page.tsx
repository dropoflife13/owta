import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { BarangayStatusBoard, BarangayStatusItem } from '@/components/status/BarangayStatusBoard'
import { Droplet, AlertTriangle, FileText, Lock, PlusCircle, BarChart3 } from 'lucide-react'

export const instant = false

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="max-w-md w-full p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 mb-4 text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Supabase Credentials Required
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Configure your environment variables in Vercel or local <code>.env.local</code> to connect to the live database.
          </p>
        </div>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Fetch live barangay statuses from view
  const { data: statusRows } = await supabase
    .from('v_public_barangay_status')
    .select('*')
    .order('barangay_name')

  // 2. Fetch latest pressure readings to derive accurate as_of and gauge pressure
  const { data: readings } = await supabase
    .from('pressure_readings')
    .select('barangay_id, pressure_psi, recorded_at, source, is_simulated')
    .order('recorded_at', { ascending: false })

  // Stale threshold: 360 minutes (6 hours) per methodology
  const STALE_THRESHOLD_MS = 360 * 60 * 1000
  const nowMs = Date.now()

  let newestRecordedAt: string | null = null

  // Map latest readings by barangay_id
  const readingsByBarangay: Record<string, { psi: number; recorded_at: string; is_simulated: boolean }> = {}
  if (readings && readings.length > 0) {
    newestRecordedAt = readings[0].recorded_at
    for (const r of readings) {
      if (r.barangay_id && !readingsByBarangay[r.barangay_id]) {
        readingsByBarangay[r.barangay_id] = {
          psi: Number(r.pressure_psi),
          recorded_at: r.recorded_at,
          is_simulated: Boolean(r.is_simulated),
        }
      }
    }
  }

  // Derive global stale flag
  const isGlobalStale = newestRecordedAt
    ? nowMs - new Date(newestRecordedAt).getTime() > STALE_THRESHOLD_MS
    : true

  // Combine and format for presentation
  const barangays: BarangayStatusItem[] = (statusRows || []).map((row: any) => {
    const reading = readingsByBarangay[row.barangay_id]

    let asOfTime = reading?.recorded_at || newestRecordedAt
    let isItemStale = isGlobalStale

    if (reading?.recorded_at) {
      isItemStale = nowMs - new Date(reading.recorded_at).getTime() > STALE_THRESHOLD_MS
    }

    return {
      barangay_id: row.barangay_id,
      barangay_code: row.barangay_code || 'BRGY',
      barangay_name: row.barangay_name,
      district_name: row.district_name || 'Mandurriao',
      current_status: row.current_status || 'unknown',
      current_window_end: row.current_window_end,
      next_window_start: row.next_window_start,
      active_incident_clusters: Number(row.active_incident_clusters || 0),
      active_advisory_count: Number(row.active_advisory_count || 0),
      latest_psi: reading ? reading.psi : null,
      as_of: asOfTime,
      is_simulated: reading ? reading.is_simulated : false,
      is_stale: isItemStale,
    }
  })

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Top Header & Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Droplet className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
                OWTA
              </span>
              <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-500 ml-2 font-medium">
                Iloilo Water Transparency
              </span>
            </div>
          </Link>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Outage</span>
            </Link>

            <Link
              href="/index"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Delivery Index</span>
            </Link>

            <Link
              href="/methodology"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Methodology</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Staff</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Section */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Iloilo City Water Transparency
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Real-time public status board and telemetry-verified delivery index across Mandurriao and participating water districts. Every figure backed by sensor timestamps.
          </p>
        </div>

        {/* Status Board Component */}
        <BarangayStatusBoard
          items={barangays}
          globalAsOf={newestRecordedAt}
          isGlobalStale={isGlobalStale}
        />
      </main>

      {/* Footer & Privacy Notice (RA 10173) */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 OWTA — Open Water Transparency Architecture. Neutral, evidence-first civic water accounting.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/index" className="hover:underline">
              Weekly Delivery Index
            </Link>
            <span>•</span>
            <Link href="/methodology" className="hover:underline">
              Delivery Index Method
            </Link>
            <span>•</span>
            <span title="Compliant with Republic Act No. 10173">RA 10173 Privacy Protected</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
