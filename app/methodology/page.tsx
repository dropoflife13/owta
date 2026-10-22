import Link from 'next/link'
import {
  BookOpen,
  Calculator,
  AlertTriangle,
  ArrowRight,
  Truck,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-sans flex flex-col transition-colors selection:bg-sky-500 selection:text-white">
      {/* Universal Public Navigation Header */}
      <PublicHeader />

      {/* Main Content with Spacious Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-14">
        {/* Hero Title */}
        <div className="space-y-3 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>Open Civic Standard • Version 1.0</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            OWTA Methodology &amp; Mathematical Specification
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            The Open Water Transparency Architecture (OWTA) is a public verification standard governing water service accountability, rotational supply auditing, and emergency municipal relief prioritization in Iloilo City.
          </p>
        </div>

        {/* Section 1: The Delivery Index Formula */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              1. The Water Delivery Index Formula (WR04, WR12)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The Weekly Water Delivery Index quantifies the degree to which a water concessionaire fulfills its published supply commitments to each District Metered Area (DMA).
          </p>

          {/* Mathematical Callout */}
          <div className="p-7 sm:p-8 rounded-3xl bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Official Mathematical Specification:
            </p>
            <div className="text-center py-3 text-lg sm:text-2xl font-mono font-extrabold text-emerald-400">
              Index = min(1.0, Delivered Hours / Promised Hours) &times; 100%
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 pt-4 border-t border-slate-800">
              <div>
                <strong className="text-white">Promised Hours:</strong> Cumulative duration of published rotational schedule windows for the evaluation cycle (Rule WR01).
              </div>
              <div>
                <strong className="text-white">Delivered Hours:</strong> Aggregate 15-minute telemetry epochs with median hydraulic pressure &ge; 7.00 PSI.
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Rule WR04 Minimum Coverage Floor */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              2. Minimum Telemetry Coverage Floor (Rule WR04)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            To prevent distorted scores caused by sensor outages or missing telemetry data, the calculation engine enforces a mandatory <strong>70.0% Telemetry Coverage Floor</strong>:
          </p>

          <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-2 shadow-sm">
            <p className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Anti-Tampering &amp; Data Suppression Principle:</span>
            </p>
            <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              If sensor coverage during promised windows falls below 70%, the delivery score is strictly suppressed (rendered as <code>null</code>) and marked <strong>&ldquo;Insufficient Data&rdquo;</strong>. The system never guesses or interpolates missing readings.
            </p>
          </div>
        </section>

        {/* Section 3: Performance Tiers */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              3. Qualitative Performance Tiers
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Performance Tier</th>
                  <th className="p-4">Score Range</th>
                  <th className="p-4">Civic Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr>
                  <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">EXEMPLARY</td>
                  <td className="p-4 font-mono font-medium">&ge; 90.0%</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">Consistent full rotational supply delivered at standard operating pressure.</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-sky-600 dark:text-sky-400">SATISFACTORY</td>
                  <td className="p-4 font-mono font-medium">75.0% – 89.9%</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">Minor pressure drop or delayed pressurization; acceptable municipal compliance.</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-amber-600 dark:text-amber-400">DEGRADED</td>
                  <td className="p-4 font-mono font-medium">50.0% – 74.9%</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">Significant outage hours; formal utility explanation requested by LGU.</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-rose-600 dark:text-rose-400">CRITICAL DEFICIT</td>
                  <td className="p-4 font-mono font-medium">&lt; 50.0%</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">Severe supply collapse; triggers automatic CDRRMO relief matrix review.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Emergency Relief Priority Scoring */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              4. Emergency Relief Priority Matrix Formula
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            When municipal water tankers are dispatched by CDRRMO, priority ranking is strictly computed via a multi-factor vulnerability algorithm to remove political bias:
          </p>

          <div className="p-7 sm:p-8 rounded-3xl bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="text-center py-2 text-sm sm:text-base font-mono font-bold text-sky-400 leading-relaxed">
              Priority Score = (Dry Hours &times; 0.4) + (Hospital Proximity &times; 0.3) + (Vulnerable Pop &times; 0.2) + (Report Volume &times; 0.1)
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-center text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OWTA Iloilo • Open Water Transparency Architecture</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
              Live Status Board
            </Link>
            <Link href="/index" className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline">
              Delivery Index Scoreboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
