import Link from 'next/link'
import {
  Droplet,
  BookOpen,
  ShieldCheck,
  Calculator,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Truck,
  CheckCircle2,
  FileText,
} from 'lucide-react'

export const instant = false

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
                <Droplet className="w-4 h-4 fill-current" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
                OWTA
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Status Board
              </Link>
              <Link
                href="/index"
                className="px-3 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Delivery Index
              </Link>
              <Link
                href="/methodology"
                className="px-3 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40"
              >
                Methodology
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/index"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              View Weekly Scores
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Hero Title */}
        <div className="space-y-3 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Civic Standard • Version 1.0</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            OWTA Methodology &amp; Mathematical Specification
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The Open Water Transparency Architecture (OWTA) is a public verification standard governing water service accountability, rotational supply auditing, and emergency municipal relief prioritization in Iloilo City.
          </p>
        </div>

        {/* Section 1: The Delivery Index Formula */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              1. The Water Delivery Index Formula (WR04, WR12)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The Weekly Water Delivery Index quantifies the degree to which a water concessionaire fulfills its published supply commitments to each District Metered Area (DMA).
          </p>

          {/* Mathematical Callout */}
          <div className="p-6 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 space-y-3 shadow-md">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Official Mathematical Specification:
            </p>
            <div className="text-center py-3 text-lg sm:text-xl font-mono font-bold text-emerald-400">
              Index = min(1.0, Delivered Hours / Promised Hours) &times; 100%
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              2. Minimum Telemetry Coverage Floor (Rule WR04)
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            To prevent distorted scores caused by sensor outages or missing telemetry data, the calculation engine enforces a mandatory <strong>70.0% Telemetry Coverage Floor</strong>:
          </p>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-bold">Anti-Tampering &amp; Data Suppression Principle:</p>
            <p className="leading-relaxed">
              If sensor coverage during promised windows falls below 70%, the delivery score is strictly suppressed (rendered as <code>null</code>) and marked <strong>&ldquo;Insufficient Data&rdquo;</strong>. The system never guesses or interpolates missing readings.
            </p>
          </div>
        </section>

        {/* Section 3: Performance Tiers */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              3. Qualitative Performance Tiers
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Performance Tier</th>
                  <th className="p-3">Score Range</th>
                  <th className="p-3">Civic Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">EXEMPLARY</td>
                  <td className="p-3 font-mono font-bold">&ge; 90.0%</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Consistent full rotational supply delivered at standard operating pressure.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-600 dark:text-blue-400">SATISFACTORY</td>
                  <td className="p-3 font-mono font-bold">75.0% – 89.9%</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Minor pressure drop or delayed pressurization; acceptable municipal compliance.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-amber-600 dark:text-amber-400">DEGRADED</td>
                  <td className="p-3 font-mono font-bold">50.0% – 74.9%</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Significant outage hours; formal utility explanation requested by LGU.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-rose-600 dark:text-rose-400">CRITICAL DEFICIT</td>
                  <td className="p-3 font-mono font-bold">&lt; 50.0%</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Severe supply collapse; triggers automatic CDRRMO relief matrix review.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-zinc-600 dark:text-zinc-400">DATA DEFICIENT</td>
                  <td className="p-3 font-mono">Coverage &lt; 70.0%</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">Telemetry failure; percentage suppressed pursuant to Rule WR04.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Rules WR01, WR06, WR10, WR11, WR12 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              4. Key Business Rules &amp; Architectural Invariants
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 shadow-xs">
              <span className="font-mono font-black text-blue-600 dark:text-blue-400">RULE WR01</span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Non-Overlapping Supply Schedules</p>
              <p className="text-zinc-500 leading-relaxed">
                Database GiST exclusion constraints prohibit conflicting published windows for the same DMA. Adjustments must supersede earlier records to guarantee an unbroken audit trail.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 shadow-xs">
              <span className="font-mono font-black text-rose-600 dark:text-rose-400">RULE WR06 / WR10</span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">48-Hour Continuous Dry Zone Elevation</p>
              <p className="text-zinc-500 leading-relaxed">
                Emergency municipal tanker relief is prioritized strictly by verified continuous dry duration &ge; 48 hours. Stale or unknown telemetry never triggers relief.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 shadow-xs">
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">RULE WR11</span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Closed-Loop Dispatch Verification</p>
              <p className="text-zinc-500 leading-relaxed">
                Relief tanker missions cannot be closed without affirmative on-site recipient sign-off, eliminating ghost dispatches and diversion of municipal water resources.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5 shadow-xs">
              <span className="font-mono font-black text-amber-600 dark:text-amber-400">RULE WR12</span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Simulated Telemetry Isolation</p>
              <p className="text-zinc-500 leading-relaxed">
                Synthetic and development test feeds are visibly flagged and excluded at the SQL level from public delivery scores, protecting index integrity.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation CTAs */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            &larr; Return to Public Status Board
          </Link>

          <Link
            href="/index"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <span>Explore Live Delivery Index Scoreboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-xs text-center text-zinc-400">
        <div className="max-w-4xl mx-auto px-4">
          Open Water Transparency Architecture • Published Under Open Government Principles
        </div>
      </footer>
    </div>
  )
}
