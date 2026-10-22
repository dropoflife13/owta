import { createPublicClient } from '@/utils/supabase/public'
import Link from 'next/link'
import { CitizenReportForm, BarangayOption } from '@/components/forms/CitizenReportForm'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ArrowLeft, Droplet, ShieldCheck, MapPin } from 'lucide-react'
import { cacheLife } from 'next/cache'

export default async function ReportPage() {
  'use cache'
  cacheLife('hours')

  const supabase = createPublicClient()

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
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 font-sans flex flex-col transition-colors selection:bg-sky-500 selection:text-white">
      {/* Universal Public Navigation Header */}
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 sm:space-y-12">
        {/* Title Header with Spacious Breathing Room */}
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Anonymous Citizen Ingestion</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Citizen Outage Report &amp; Triage
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
            Reports are spatial-clustered within 200m to alert Barangay Officials and prioritize CDRRMO relief tankers. No account or personal sign-in required.
          </p>
        </div>

        {/* Citizen Report Form Component */}
        <CitizenReportForm barangays={barangayOptions} />
      </main>

      {/* Footer & Privacy Notice (RA 10173) */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-slate-500 dark:text-slate-400">
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
