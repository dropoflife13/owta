import Link from 'next/link'
import { createPublicClient } from '@/utils/supabase/public'
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Radio,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { cacheLife } from 'next/cache'

export default async function WaterIndexPage() {
  'use cache'
  cacheLife('minutes')

  const supabase = createPublicClient()

  // 1. Query Delivery Index History (View: v_public_water_index)
  const { data: indexScores } = await supabase
    .from('v_public_water_index')
    .select('*')
    .order('evaluation_start', { ascending: false })

  // 2. Query Methodology Parameters
  const { data: params } = await supabase
    .from('methodology_parameters')
    .select('*')
    .eq('is_active', true)
    .single()

  // 3. Check for Simulated Pressure Telemetry (Rule WR12)
  const { data: simulatedReadings } = await supabase
    .from('pressure_readings')
    .select('is_simulated')
    .eq('is_simulated', true)
    .limit(1)

  const isSimulatedActive = (simulatedReadings && simulatedReadings.length > 0) || false

  // Format date in Asia/Manila
  const formatDateRange = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso)
      const e = new Date(endIso)
      const fmt = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
      })
      const yr = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
      }).format(e)
      return `${fmt.format(s)} – ${fmt.format(e)}, ${yr}`
    } catch {
      return `${startIso} - ${endIso}`
    }
  }

  const renderTierBadge = (tier: string, score: number | null) => {
    switch (tier) {
      case 'EXEMPLARY':
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
            Exemplary ({score?.toFixed(1)}%)
          </span>
        )
      case 'SATISFACTORY':
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 shadow-xs">
            Satisfactory ({score?.toFixed(1)}%)
          </span>
        )
      case 'MARGINAL':
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-xs">
            Marginal ({score?.toFixed(1)}%)
          </span>
        )
      case 'UNSATISFACTORY':
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 shadow-xs">
            Unsatisfactory ({score?.toFixed(1)}%)
          </span>
        )
      case 'DATA_DEFICIENT':
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 shadow-xs">
            Insufficient Data (WR04)
          </span>
        )
      default:
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {tier}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-sans flex flex-col transition-colors selection:bg-sky-500 selection:text-white">
      {/* Universal Public Navigation Header */}
      <PublicHeader />

      {/* Main Container with Generous Spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-14">
        {/* Banner: Simulated Telemetry Transparency (Rule WR12) */}
        {isSimulatedActive && (
          <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/90 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 text-xs flex items-start gap-3.5 shadow-sm">
            <Radio className="w-5 h-5 text-purple-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold">Rule WR12 Notice: Simulated Telemetry Active in Environment</p>
              <p className="text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                Development telemetry test feeds are flagged in this environment. In strict adherence to Rule WR12, simulated readings are completely isolated from production calculations and do not distort published public index percentages.
              </p>
            </div>
          </div>
        )}

        {/* Title Section with Breathing Room */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                Weekly Water Delivery Index
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 shadow-xs">
                Methodology {params?.version || 'v1.0'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Public accountability scoreboard comparing promised rotational water supply hours against verified hydraulic pressure telemetry delivered to Iloilo City consumers.
            </p>
          </div>

          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm hover:shadow transition-all shrink-0"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Read Mathematical Formula</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Methodology Parameter Quick Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pressure Threshold
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 mt-2">
              &ge; {params?.min_pressure_threshold || 7.0} PSI
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">PNSDW Service Standard Floor</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Coverage Floor (WR04)
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 mt-2">
              {((params?.min_coverage_floor || 0.7) * 100).toFixed(0)}% Min
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Telemetry Completeness</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sampling Epoch
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 mt-2">
              {params?.epoch_minutes || 15} Minutes
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Median Epoch Binning</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Standard
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              Append-Only
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Rule WR08 Integrity</span>
          </div>
        </div>

        {/* Index Scorecards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <span>Weekly District Metered Area (DMA) Scorecards</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Evaluated every 7-day cycle
            </span>
          </div>

          {(!indexScores || indexScores.length === 0) ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <BarChart3 className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                Initial Evaluation In Progress
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Weekly Delivery Index snapshots are generated at the close of every 7-day operational cycle. Historical telemetry will appear here once verified.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {indexScores.map((score: any) => {
                const isDeficient = score.status_tier === 'DATA_DEFICIENT'
                const coveragePct = (Number(score.coverage_ratio) * 100).toFixed(1)

                return (
                  <div
                    key={score.index_id}
                    className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-6"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {score.dma_code}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                            {score.dma_name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5 font-mono">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Cycle: {formatDateRange(score.evaluation_start, score.evaluation_end)}</span>
                        </p>
                      </div>

                      <div>{renderTierBadge(score.status_tier, score.delivery_index_score)}</div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 font-medium">Promised Supply:</span>
                        <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                          {score.promised_hours} hrs
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Scheduled Window</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 font-medium">Delivered (&ge; 7 PSI):</span>
                        <p className="text-xl sm:text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                          {score.delivered_hours} hrs
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Telemetry Verified</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 font-medium">Telemetry Coverage:</span>
                        <p
                          className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
                            Number(score.coverage_ratio) < 0.7
                              ? 'text-amber-600'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {coveragePct}%
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Floor: 70% (WR04)</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 font-medium">Final Index Score:</span>
                        {isDeficient ? (
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-2">
                            Suppressed (WR04)
                          </p>
                        ) : (
                          <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                            {score.delivery_index_score?.toFixed(1)}%
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {isDeficient ? 'Coverage < 70%' : 'Delivered / Promised'}
                        </span>
                      </div>
                    </div>

                    {/* WR04 Notice for Data Deficient Weeks */}
                    {isDeficient && (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Rule WR04 Suppression: Insufficient Telemetry Coverage</p>
                          <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                            Hydraulic sensor telemetry coverage during scheduled windows reached only {coveragePct}%, which falls below the mandatory 70.0% coverage floor. Pursuant to Rule WR04, index percentages are suppressed to prevent misleading score calculations during sensor outages.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-center text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Republic of the Philippines • City of Iloilo • Open Water Transparency Architecture</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
              Live Status Board
            </Link>
            <span>•</span>
            <Link href="/methodology" className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
              Methodology v1.0
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
              Authorized Staff
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
