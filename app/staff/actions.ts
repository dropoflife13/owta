'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateReportTriageAction(formData: FormData) {
  const reportId = formData.get('reportId') as string
  const clusterId = formData.get('clusterId') as string | null
  const newStatus = formData.get('status') as string
  const notes = formData.get('notes') as string | null

  if (!reportId || !newStatus) {
    return { error: 'Report ID and Status are required.' }
  }

  const validStatuses = ['submitted', 'verified', 'triaged', 'dispatched', 'resolved', 'rejected']
  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status: ${newStatus}` }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to perform triage actions.' }
  }

  // 2. Fetch staff profile & enforce permissions (Rule WR06)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified, assigned_barangay_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_verified || profile.role === 'resident') {
    return { error: 'Access Denied: Unverified staff account cannot triage reports.' }
  }

  // If barangay_official, fetch report to check barangay match
  if (profile.role === 'barangay_official') {
    const { data: report } = await supabase
      .from('water_reports')
      .select('barangay_id')
      .eq('id', reportId)
      .single()

    if (report && report.barangay_id !== profile.assigned_barangay_id) {
      return { error: 'Access Denied: You may only triage reports in your assigned barangay (Rule WR06).' }
    }
  }

  // 3. Update report record
  const { error: updateError } = await supabase
    .from('water_reports')
    .update({
      status: newStatus,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 4. Update cluster record if applicable
  if (clusterId) {
    await supabase
      .from('report_clusters')
      .update({
        status: newStatus,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', clusterId)
  }

  // 5. Append-only Audit Trail (Rule WR08)
  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: `REPORT_TRIAGE_${newStatus.toUpperCase()}`,
      target_table: 'water_reports',
      record_id: reportId,
      new_state: {
        status: newStatus,
        notes: notes || null,
        verified_by: user.id,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (auditErr) {
    console.warn('Audit log write error:', auditErr)
  }

  revalidatePath('/staff/reports')
  revalidatePath('/')

  return { success: true }
}

