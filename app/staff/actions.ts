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

export async function dispatchTankerAction(formData: FormData) {
  const barangayId = formData.get('barangayId') as string
  const clusterId = formData.get('clusterId') as string | null
  const tankerPlateNumber = formData.get('tankerPlateNumber') as string
  const driverName = formData.get('driverName') as string
  const capacityLiters = parseInt(formData.get('capacityLiters') as string, 10) || 10000
  const notes = formData.get('notes') as string | null

  if (!barangayId || !tankerPlateNumber || !driverName) {
    return { error: 'Barangay, Tanker Plate Number, and Driver Name are required.' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in as an authorized dispatcher.' }
  }

  // 2. Fetch staff profile & enforce permissions (Rule WR06)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    !profile.is_verified ||
    (profile.role !== 'lgu_dispatcher' && profile.role !== 'admin')
  ) {
    return {
      error:
        'Access Denied: Only verified CDRRMO dispatchers and administrators may dispatch relief tankers.',
    }
  }

  // 3. Insert into relief_dispatches
  const { data: dispatchRecord, error: dispatchError } = await supabase
    .from('relief_dispatches')
    .insert({
      barangay_id: barangayId,
      tanker_plate_number: tankerPlateNumber.toUpperCase().trim(),
      driver_name: driverName.trim(),
      capacity_liters: capacityLiters,
      status: 'in_transit',
      dispatched_by: user.id,
      dispatched_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (dispatchError) {
    return { error: dispatchError.message }
  }

  // 4. Update cluster status if clusterId provided
  if (clusterId) {
    await supabase
      .from('report_clusters')
      .update({
        status: 'dispatched',
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
      action: 'TANKER_DISPATCHED',
      target_table: 'relief_dispatches',
      record_id: dispatchRecord.id,
      new_state: {
        barangay_id: barangayId,
        tanker_plate_number: tankerPlateNumber,
        driver_name: driverName,
        capacity_liters: capacityLiters,
        notes: notes || null,
        cluster_id: clusterId || null,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (auditErr) {
    console.warn('Audit log write error:', auditErr)
  }

  revalidatePath('/staff/relief')
  revalidatePath('/staff/reports')
  revalidatePath('/')

  return { success: true, dispatchId: dispatchRecord.id }
}

export async function updateDispatchStatusAction(formData: FormData) {
  const dispatchId = formData.get('dispatchId') as string
  const nextStatus = formData.get('status') as string
  const recipientAcknowledgment = formData.get('recipientAcknowledgment') as string | null

  if (!dispatchId || !nextStatus) {
    return { error: 'Dispatch ID and status are required.' }
  }

  const validStatuses = ['queued', 'in_transit', 'on_site', 'completed', 'cancelled']
  if (!validStatuses.includes(nextStatus)) {
    return { error: `Invalid status: ${nextStatus}` }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    !profile.is_verified ||
    (profile.role !== 'lgu_dispatcher' && profile.role !== 'admin')
  ) {
    return { error: 'Access Denied: Only authorized dispatchers can update dispatch lifecycle.' }
  }

  const updatePayload: Record<string, any> = {
    status: nextStatus,
  }

  if (nextStatus === 'on_site') {
    updatePayload.arrived_at = new Date().toISOString()
  } else if (nextStatus === 'completed') {
    updatePayload.completed_at = new Date().toISOString()
    if (recipientAcknowledgment) {
      updatePayload.recipient_acknowledgment = recipientAcknowledgment
    }
  }

  const { error: updateError } = await supabase
    .from('relief_dispatches')
    .update(updatePayload)
    .eq('id', dispatchId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Audit log (Rule WR08)
  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: `DISPATCH_${nextStatus.toUpperCase()}`,
      target_table: 'relief_dispatches',
      record_id: dispatchId,
      new_state: {
        ...updatePayload,
        updated_by: user.id,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.warn('Audit log write error:', err)
  }

  revalidatePath('/staff/relief')
  return { success: true }
}
