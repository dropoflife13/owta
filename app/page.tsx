import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { BarangayStatusBoard, BarangayStatusItem } from '@/components/status/BarangayStatusBoard'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Droplet, AlertTriangle, ShieldCheck, Truck, Radio, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const instant = false

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 mb-4 text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Supabase Connection Pending
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Configure your environment variables in Vercel or local <code>.env.local</code> to connect to the live database.
          </p>
        </div>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Fetch live barangay statuses from security-invoker view
  const { data: statusRows } = await supabase
    .from('v_public_barangay_status')
    .select('*')
    .order('barangay_name')

  // 2. Fetch latest pressure readings
  const { data: readings } = await supabase
    .from('pressure_readings')
    .select('barangay_id, pressure_psi, recorded_at, source, is_simulated')
    .order('recorded_at', { ascending: false })

  // 3. Fetch active relief dispatches for government live status banner
  const { data: activeDispatches } = await supabase
    .from('relief_dispatches')
    .select('id, status, capacity_liters')
    .in('status', ['assigned', 'in_transit', 'on_site'])

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

  const totalDispatchesActive = activeDispatches?.length || 0

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Universal Public Navigation Header with Official Gov Bar */}
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Civic Trust & Operations Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <Radio className="w-3 h-3 text-sky-600 animate-pulse" />
                Live Telemetry Ingestion
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Mandated under City Water Transparency Framework
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Iloilo City Water Status &amp; Transparency Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Official municipal transparency portal publishing real-time hydraulic pressure telemetry, citizen-verified outage clusters, and audited rotational supply compliance across all 180 barangays.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Statutory Assurance
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 justify-end">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Evidence-First Civic Standard
              </span>
            </div>

            {totalDispatchesActive > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Truck className="w-3.5 h-3.5 text-purple-600" />
                <span>{totalDispatchesActive} CDRRMO Tankers Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Board Component with Toggles & Maps */}
        <BarangayStatusBoard
          items={barangays}
          globalAsOf={newestRecordedAt}
          isGlobalStale={isGlobalStale}
        />
      </main>

      {/* Official Civic Footer (RA 10173 & Rule WR07) */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-sky-600" />
            <p>
              © 2026 Republic of the Philippines • Open Water Transparency Architecture (OWTA).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/index" className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline">
              Weekly Delivery Index
            </Link>
            <span>•</span>
            <Link href="/methodology" className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline">
              Open Methodology
            </Link>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400" title="Compliant with Republic Act No. 10173">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              RA 10173 Privacy Protected
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
