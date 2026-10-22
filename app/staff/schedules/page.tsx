import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ScheduleEditor,
  DmaZoneItem,
  WaterScheduleItem,
} from '@/components/staff/ScheduleEditor'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export const instant = false

export default async function SchedulesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile & role guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified, first_name, last_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'resident'
  const isVerified = Boolean(profile?.is_verified)

  // Strict role guard: only utility_operator and admin can publish or modify schedules
  if (!isVerified || (role !== 'utility_operator' && role !== 'admin')) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
          Utility Operator Access Restricted
        </h1>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
          The Rotational Water Supply Schedule Publisher is restricted to authorized Concessionaire Operators (MPIW) and System Administrators. Barangay officials and dispatchers may view published schedules from the public status board.
        </p>
        <div className="pt-2">
          <Link
            href="/staff/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Incident Triage</span>
          </Link>
        </div>
      </div>
    )
  }

  // 3. Query DMA Zones
  const { data: rawDmas } = await supabase
    .from('dma_zones')
    .select('id, code, name, description')
    .order('code', { ascending: true })

  const dmaZones: DmaZoneItem[] = (rawDmas || []).map((d: any) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    description: d.description,
  }))

  // 4. Query Water Schedules
  const { data: rawSchedules } = await supabase
    .from('water_schedules')
    .select(`
      id,
      dma_zone_id,
      window_start,
      window_end,
      published_by,
      published_at,
      superseded_at,
      superseded_by_id,
      notes,
      dma_zones (
        code,
        name
      )
    `)
    .order('created_at', { ascending: false })

  const schedules: WaterScheduleItem[] = (rawSchedules || []).map((s: any) => ({
    id: s.id,
    dma_zone_id: s.dma_zone_id,
    dma_code: s.dma_zones?.code || 'DMA',
    dma_name: s.dma_zones?.name || 'District Metered Area',
    window_start: s.window_start,
    window_end: s.window_end,
    published_by: s.published_by,
    published_at: s.published_at,
    superseded_at: s.superseded_at,
    superseded_by_id: s.superseded_by_id,
    notes: s.notes,
  }))

  return (
    <ScheduleEditor
      dmaZones={dmaZones}
      schedules={schedules}
      userRole={role}
    />
  )
}
