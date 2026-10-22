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

export async function publishScheduleAction(formData: FormData) {
  const dmaZoneId = formData.get('dmaZoneId') as string
  const windowStart = formData.get('windowStart') as string
  const windowEnd = formData.get('windowEnd') as string
  const notes = formData.get('notes') as string | null

  if (!dmaZoneId || !windowStart || !windowEnd) {
    return { error: 'DMA Zone, Window Start, and Window End are required.' }
  }

  const startMs = new Date(windowStart).getTime()
  const endMs = new Date(windowEnd).getTime()
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { error: 'Schedule window end time must be after start time (Rule WR01).' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in as an authorized utility operator.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    !profile.is_verified ||
    (profile.role !== 'utility_operator' && profile.role !== 'admin')
  ) {
    return {
      error:
        'Access Denied: Only verified Concessionaire Operators and Administrators can publish schedules.',
    }
  }

  // Enforce Non-Overlapping Schedule Windows (Rule WR01)
  const { data: overlapping } = await supabase
    .from('water_schedules')
    .select('id, window_start, window_end')
    .eq('dma_zone_id', dmaZoneId)
    .is('superseded_at', null)
    .lt('window_start', new Date(endMs).toISOString())
    .gt('window_end', new Date(startMs).toISOString())

  if (overlapping && overlapping.length > 0) {
    const conflictStart = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
    }).format(new Date(overlapping[0].window_start))
    const conflictEnd = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
    }).format(new Date(overlapping[0].window_end))

    return {
      error: `Schedule Conflict (Rule WR01): This window overlaps with an active published schedule (${conflictStart} - ${conflictEnd}). You must use "Supersede Schedule" to adjust an active window.`,
    }
  }

  // Insert active schedule
  const { data: newSchedule, error: insertError } = await supabase
    .from('water_schedules')
    .insert({
      dma_zone_id: dmaZoneId,
      window_start: new Date(startMs).toISOString(),
      window_end: new Date(endMs).toISOString(),
      published_by: user.id,
      notes: notes || null,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  // Audit Log (Rule WR08)
  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'SCHEDULE_PUBLISHED',
      target_table: 'water_schedules',
      record_id: newSchedule.id,
      new_state: {
        dma_zone_id: dmaZoneId,
        window_start: new Date(startMs).toISOString(),
        window_end: new Date(endMs).toISOString(),
        notes: notes || null,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.warn('Audit log write error:', err)
  }

  revalidatePath('/staff/schedules')
  revalidatePath('/methodology')
  revalidatePath('/index')
  revalidatePath('/')

  return { success: true, scheduleId: newSchedule.id }
}

export async function supersedeScheduleAction(formData: FormData) {
  const oldScheduleId = formData.get('oldScheduleId') as string
  const dmaZoneId = formData.get('dmaZoneId') as string
  const windowStart = formData.get('windowStart') as string
  const windowEnd = formData.get('windowEnd') as string
  const notes = formData.get('notes') as string | null

  if (!oldScheduleId || !dmaZoneId || !windowStart || !windowEnd) {
    return { error: 'Old Schedule ID, DMA, and new window times are required.' }
  }

  const startMs = new Date(windowStart).getTime()
  const endMs = new Date(windowEnd).getTime()
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    return { error: 'Schedule window end time must be after start time (Rule WR01).' }
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
    (profile.role !== 'utility_operator' && profile.role !== 'admin')
  ) {
    return { error: 'Access Denied: Only utility operators and admins can supersede schedules.' }
  }

  // 1. Insert the replacement schedule
  const { data: replacement, error: insertError } = await supabase
    .from('water_schedules')
    .insert({
      dma_zone_id: dmaZoneId,
      window_start: new Date(startMs).toISOString(),
      window_end: new Date(endMs).toISOString(),
      published_by: user.id,
      notes: notes || 'Superseding operational adjustment',
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  // 2. Mark the previous schedule as superseded (Rule WR01)
  const nowIso = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('water_schedules')
    .update({
      superseded_at: nowIso,
      superseded_by_id: replacement.id,
    })
    .eq('id', oldScheduleId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 3. Append to Audit Log (Rule WR08)
  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'SCHEDULE_SUPERSEDED',
      target_table: 'water_schedules',
      record_id: oldScheduleId,
      new_state: {
        superseded_by_id: replacement.id,
        superseded_at: nowIso,
        new_window_start: new Date(startMs).toISOString(),
        new_window_end: new Date(endMs).toISOString(),
        reason: notes || null,
        timestamp: nowIso,
      },
    })
  } catch (err) {
    console.warn('Audit log write error:', err)
  }

  revalidatePath('/staff/schedules')
  revalidatePath('/methodology')
  revalidatePath('/index')
  revalidatePath('/')

  return { success: true, replacementId: replacement.id }
}
