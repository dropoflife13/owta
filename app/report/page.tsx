import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { CitizenReportForm, BarangayOption } from '@/components/forms/CitizenReportForm'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ArrowLeft, Droplet, ShieldCheck } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Universal Public Navigation Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="max-w-xl mx-auto text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
            <span>Anonymous Citizen Ingestion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Citizen Outage Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Reports are spatial-clustered within 200m to alert Barangay Officials and prioritize CDRRMO relief tankers. No account required.
          </p>
        </div>

        {/* Citizen Report Form Component */}
        <CitizenReportForm barangays={barangayOptions} />
      </main>

      {/* Footer & Privacy Notice (RA 10173) */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 OWTA — Philippine Data Privacy Act of 2012 (RA 10173) Compliant</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline">
              Status Board
            </Link>
            <span>•</span>
            <Link href="/methodology" className="hover:text-slate-900 dark:hover:text-slate-200 hover:underline">
              Clustering Rules
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
