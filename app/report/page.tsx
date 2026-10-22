import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { CitizenReportForm, BarangayOption } from '@/components/forms/CitizenReportForm'
import { ArrowLeft, Droplet } from 'lucide-react'

export const instant = false

export default async function ReportPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch barangays with district info
  const { data: barangaysData } = await supabase
    .from('barangays')
    .select('id, name, code, districts(name)')
    .order('name')

  const barangayOptions: BarangayOption[] = (barangaysData || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    district_name: b.districts?.name || 'Iloilo City',
  }))

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Status Board</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Droplet className="w-4 h-4 fill-current" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              OWTA Report Desk
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="max-w-xl mx-auto text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Citizen Outage Report
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Reports are automatically clustered within 200m to inform Barangay Officials and CDRRMO dispatchers.
          </p>
        </div>

        {/* Citizen Report Form */}
        <CitizenReportForm barangays={barangayOptions} />

        {/* Rules & Privacy Callout */}
        <div className="max-w-xl mx-auto p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-500 space-y-2">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">How OWTA Handles Outage Reports:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
            <li>
              <strong>Automated Spatiotemporal Clustering (Rule WR05):</strong> Multiple reports within 200m and 3 hours are merged into one incident cluster, incrementing the public severity count.
            </li>
            <li>
              <strong>Zero Public Coordinates or PII (Rule WR07):</strong> Your phone number, landmark text, and exact coordinates are strictly hidden from public views.
            </li>
            <li>
              <strong>Rate Limiting (Rule WR04):</strong> Submissions are rate-limited to 3 reports per device per hour to protect against false incident flooding.
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-xs text-center text-zinc-400">
        <div className="max-w-4xl mx-auto px-4">
          Protected by Cloudflare Turnstile & Salted Device Fingerprinting • Compliant with RA 10173
        </div>
      </footer>
    </div>
  )
}

