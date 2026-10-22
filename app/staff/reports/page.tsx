import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReportTriageBoard, TriageReportItem } from '@/components/staff/ReportTriageBoard'

export const instant = false

export default async function StaffReportsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch verified profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified, assigned_barangay_id, barangays(name)')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'resident'
  const assignedBarangayName = (profile as any)?.barangays?.name || null

  // Fetch reports with RLS boundary enforcement (Rule WR06)
  let query = supabase
    .from('water_reports')
    .select(`
      id,
      ticket_token,
      cluster_id,
      barangay_id,
      category,
      description,
      landmark,
      status,
      created_at,
      verified_at,
      barangays (
        name,
        districts (name)
      ),
      report_clusters (
        report_count
      )
    `)
    .order('created_at', { ascending: false })

  if (role === 'barangay_official' && profile?.assigned_barangay_id) {
    query = query.eq('barangay_id', profile.assigned_barangay_id)
  }

  const { data: rawReports, error: queryError } = await query

  const reports: TriageReportItem[] = (rawReports || []).map((r: any) => ({
    id: r.id,
    ticket_token: r.ticket_token,
    cluster_id: r.cluster_id,
    barangay_id: r.barangay_id,
    barangay_name: r.barangays?.name || 'Assigned Barangay',
    district_name: r.barangays?.districts?.name || 'Iloilo City',
    category: r.category,
    description: r.description,
    landmark: r.landmark,
    status: r.status,
    cluster_count: r.report_clusters?.report_count || 1,
    created_at: r.created_at,
    verified_at: r.verified_at,
  }))

  return (
    <ReportTriageBoard
      reports={reports}
      assignedBarangayName={assignedBarangayName}
      userRole={role}
    />
  )
}

