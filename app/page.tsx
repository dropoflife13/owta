import { createPublicClient } from '@/utils/supabase/public'
import Link from 'next/link'
import { BarangayStatusBoard, BarangayStatusItem } from '@/components/status/BarangayStatusBoard'
import { CitywideAnalyticsCharts } from '@/components/status/CitywideAnalyticsCharts'
import { PublicHeader } from '@/components/layout/PublicHeader'
import {
  Droplet,
  ShieldCheck,
  Truck,
  Radio,
  BarChart3,
  ArrowRight,
  PlusCircle,
  Scale,
  Activity,
  Layers,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

import { cacheLife } from 'next/cache'

export default async function HomePage() {
  'use cache'
  cacheLife({
    stale: 30,
    revalidate: 30,
    expire: 300,
  })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 text-2xl mx-auto shadow-inner">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Supabase Connection Pending
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Configure your environment variables in Vercel or local <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">.env.local</code> to connect to the live municipal database.
          </p>
        </div>
      </main>
    )
  }

  // Edge-cached anonymous client (zero cookie check overhead, sub-50ms TTFB via Vercel Edge CDN)
  const supabase = createPublicClient()

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

  // 3. Fetch active relief dispatches
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
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-sans flex flex-col transition-colors selection:bg-sky-500 selection:text-white">
      {/* Universal Public Navigation Header with Official Gov Bar & Theme Toggle */}
      <PublicHeader />

      {/* Main Content Area with Generous Spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12 sm:space-y-16">
        {/* 1. CIVIC COMMAND CENTER HERO */}
        <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white p-8 sm:p-12 shadow-2xl border border-slate-800/90 overflow-hidden">
          {/* Subtle geometric background water glow */}
          <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -top-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            {/* Top Authority & Live Ticker */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-950/80 text-sky-300 border border-sky-800 shadow-sm">
                  <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  Live Hydraulic Telemetry Active
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-xs text-slate-300 hidden sm:inline font-mono">
                  180 Barangays Monitored • Iloilo City
                </span>
              </div>

              {totalDispatchesActive > 0 ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-800 shadow-sm">
                  <Truck className="w-3.5 h-3.5 text-purple-400" />
                  <span>{totalDispatchesActive} CDRRMO Tanker Dispatches Active</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-900/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Statutory Public Audit (Rule WR01–WR12)</span>
                </div>
              )}
            </div>

            {/* Title & Mission Statement with Expanded Breathing Room */}
            <div className="space-y-4 max-w-4xl">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Iloilo City Water Transparency &amp; Public Accountability Portal
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                Independent municipal water telemetry platform for Iloilo City. Track live pressure sensor readings, verify rotational supply schedules, inspect district hydraulic performance, and submit anonymous citizen outage reports directly to Barangay and CDRRMO triage desks.
              </p>
            </div>

            {/* 2. "WHERE TO GO" INTERACTIVE GATEWAY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-3">
              {/* Card 1: Live Status Board */}
              <a
                href="#status-matrix"
                className="group p-5 sm:p-6 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
                    <span>1. Status Matrix</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Inspect hydraulic PSI readings, supply windows, and active incidents across 180 barangays.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-sky-400 font-bold uppercase mt-4 block">
                  Explore Live Board ↓
                </span>
              </a>

              {/* Card 2: Report Water Outage */}
              <Link
                href="/report"
                className="group p-5 sm:p-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg hover:shadow-sky-600/30 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center mb-4">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>2. Report Outage</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </h2>
                  <p className="text-xs text-sky-100 mt-2 leading-relaxed">
                    Experiencing low pressure or dry tap? Submit an anonymous report in 30 seconds.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold uppercase text-white/95 mt-4 block">
                  File Incident (No Sign-in) →
                </span>
              </Link>

              {/* Card 3: Weekly Delivery Index */}
              <Link
                href="/index"
                className="group p-5 sm:p-6 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                    <span>3. Delivery Index</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Audited scoreboard verifying if the utility met its promised rotational supply hours.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase mt-4 block">
                  View 7-Day Scores →
                </span>
              </Link>

              {/* Card 4: Audit Methodology */}
              <Link
                href="/methodology"
                className="group p-5 sm:p-6 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/60 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>4. Methodology</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Read the open mathematical formulas, 70% coverage floor rules, and relief scoring.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-purple-400 font-bold uppercase mt-4 block">
                  Inspect Standards →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* 2. MUNICIPAL HYDRAULIC ANALYTICS & VISUALIZATIONS */}
        <section id="analytics" className="space-y-6">
          <CitywideAnalyticsCharts items={barangays} />
        </section>

        {/* 3. LIVE STATUS BOARD & TELEMETRY SECTION */}
        <section id="status-matrix" className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Municipal Operational Telemetry
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mt-1">
                Real-Time Barangay Water Status &amp; Triage Grid
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Mandated by Statutory Transparency Rule WR02
            </p>
          </div>

          {/* Elevated Status Board Component */}
          <BarangayStatusBoard
            items={barangays}
            globalAsOf={newestRecordedAt}
            isGlobalStale={isGlobalStale}
          />
        </section>

        {/* 4. CIVIC TRUST & STATUTORY SAFEGUARDS SECTION */}
        <section className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5 max-w-3xl">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Civic Trust, Data Protection, and Legal Architecture</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              OWTA is engineered under strict statutory standards ensuring civic neutrality, citizen privacy, and mathematically verified service audits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Privacy Card */}
            <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-200/50 dark:border-emerald-800/50">
                WR07
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Statutory Privacy (RA 10173)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Zero Personal Identifiable Information is published. Exact coordinates and phone numbers are never stored in plain text or rendered on public dashboards.
              </p>
            </div>

            {/* Anti-Tampering Card */}
            <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-200/50 dark:border-amber-800/50">
                WR04
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                70% Telemetry Coverage Floor
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                To prevent distorted metrics during sensor outages, delivery index calculations are strictly suppressed if data coverage falls below the mandatory 70.0% floor.
              </p>
            </div>

            {/* Closed-Loop Relief Card */}
            <div className="p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 flex items-center justify-center font-bold text-xs border border-purple-200/50 dark:border-purple-800/50">
                WR11
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Closed-Loop Relief Verification
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Emergency water tanker dispatches require electronic verification and recipient sign-off to ensure equitable delivery to vulnerable populations.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 5. STRUCTURED CIVIC FOOTER WITH SITEMAP */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 sm:py-16 text-xs text-slate-500 dark:text-slate-400 transition-colors shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Col 1: Identity */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm">
                  <Droplet className="w-4 h-4 fill-current" />
                </div>
                <span className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  OWTA Iloilo
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Open Water Transparency Architecture for the City of Iloilo. Neutral, evidence-first civic accounting and emergency relief coordination.
              </p>
            </div>

            {/* Col 2: Public Portals */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Public Portals
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    Citywide Status Board
                  </Link>
                </li>
                <li>
                  <Link href="/report" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    File Outage Incident
                  </Link>
                </li>
                <li>
                  <Link href="/index" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    Weekly Delivery Index
                  </Link>
                </li>
                <li>
                  <Link href="/methodology" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                    Audit Methodology
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Statutory Rules */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Statutory Safeguards
              </h4>
              <ul className="space-y-2 font-mono text-[11px]">
                <li>Rule WR01: GiST Non-Overlap</li>
                <li>Rule WR02: Transparency Mandate</li>
                <li>Rule WR03: Stale Telemetry Isolation</li>
                <li>Rule WR04: 70% Coverage Floor</li>
                <li>Rule WR07: RA 10173 Privacy</li>
                <li>Rule WR11: Verified Relief Chain</li>
              </ul>
            </div>

            {/* Col 4: Emergency Hotlines */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Emergency &amp; Support
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">CDRRMO Disaster Operations:</p>
                  <p className="font-mono text-slate-500">(033) 333-1111</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Utility Concessionaire (MPIW):</p>
                  <p className="font-mono text-slate-500">(033) 320-1234</p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    <span>Staff &amp; Operator Login →</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© 2026 Republic of the Philippines • City of Iloilo • Open Water Transparency Architecture</p>
            <p>Compliant with Republic Act No. 10173 (Data Privacy Act of 2012)</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
