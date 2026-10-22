import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ReliefPriorityMatrix,
  ReliefQueueItem,
  ReliefDispatchItem,
} from '@/components/staff/ReliefPriorityMatrix'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export const instant = false

export default async function ReliefPriorityPage() {
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

  // Strict role guard: only LGU dispatchers and Admins have access to the citywide relief priority queue
  if (!isVerified || (role !== 'lgu_dispatcher' && role !== 'admin')) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
          CDRRMO Dispatch Access Restricted
        </h1>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
          The City-wide Relief Priority Matrix is reserved strictly for authorized CDRRMO Dispatchers and System Administrators. Barangay officials should review and verify localized reports in their assigned Incident Triage Desk.
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

  // 3. Query Relief Priority Queue (View: v_relief_priority_queue)
  // Rule WR06: Ordered by consecutive dry hours descending
  const { data: rawQueue } = await supabase
    .from('v_relief_priority_queue')
    .select('*')
    .order('dry_hours_elapsed', { ascending: false })

  const queue: ReliefQueueItem[] = (rawQueue || []).map((row: any) => ({
    cluster_id: row.cluster_id,
    barangay_id: row.barangay_id,
    barangay_name: row.barangay_name,
    district_name: row.district_name,
    category: row.category,
    status: row.status,
    report_count: row.report_count,
    first_reported_at: row.first_reported_at,
    last_reported_at: row.last_reported_at,
    dry_hours_elapsed: Number(row.dry_hours_elapsed) || 0,
    relief_priority_tier: row.relief_priority_tier || 'STANDARD_QUEUE',
  }))

  // 4. Query Relief Dispatches
  const { data: rawDispatches } = await supabase
    .from('relief_dispatches')
    .select(`
      id,
      barangay_id,
      tanker_plate_number,
      driver_name,
      capacity_liters,
      dispatched_at,
      arrived_at,
      completed_at,
      status,
      recipient_acknowledgment,
      barangays (
        name,
        districts (name)
      )
    `)
    .order('dispatched_at', { ascending: false })

  const dispatches: ReliefDispatchItem[] = (rawDispatches || []).map((d: any) => ({
    id: d.id,
    barangay_id: d.barangay_id,
    barangay_name: d.barangays?.name || 'Assigned Zone',
    district_name: d.barangays?.districts?.name || 'Iloilo City',
    tanker_plate_number: d.tanker_plate_number,
    driver_name: d.driver_name,
    capacity_liters: d.capacity_liters || 10000,
    dispatched_at: d.dispatched_at,
    arrived_at: d.arrived_at,
    completed_at: d.completed_at,
    status: d.status,
    recipient_acknowledgment: d.recipient_acknowledgment,
  }))

  return (
    <ReliefPriorityMatrix
      queue={queue}
      dispatches={dispatches}
      userRole={role}
    />
  )
}

