import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'

const reportSchema = z.object({
  barangay_id: z.string().uuid({ message: 'Valid barangay selection is required' }),
  category: z.enum(['dry_tap', 'low_pressure', 'dirty_water', 'pipe_burst'], {
    message: 'Please select a valid report category',
  }),
  landmark: z
    .string()
    .min(3, { message: 'Landmark must be at least 3 characters' })
    .max(200, { message: 'Landmark cannot exceed 200 characters' }),
  description: z.string().max(1000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  contact_number: z
    .string()
    .regex(/^(09|\+639)\d{9}$/, { message: 'Must be a valid Philippine mobile number (e.g. 09171234567)' })
    .optional()
    .nullable()
    .or(z.literal('')),
  consent: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = reportSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // If contact number is supplied, consent MUST be true per WR09 and RA 10173
    if (data.contact_number && data.contact_number.trim() !== '' && !data.consent) {
      return NextResponse.json(
        {
          error: 'Consent Required',
          details: ['You must consent to data retention if providing a contact number (Rule WR09).'],
        },
        { status: 400 }
      )
    }

    // Generate salted device hash for Anti-Sybil Rate Limiting (WR04)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'
    const userAgent = req.headers.get('user-agent') || 'UNKNOWN_AGENT'
    const pepper = process.env.DEVICE_KEY_PEPPER || 'owta-default-anti-sybil-pepper-2026'

    const deviceHash = crypto
      .createHmac('sha256', pepper)
      .update(`${clientIp}:${userAgent}`)
      .digest('hex')
      .slice(0, 32)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Call submit_report RPC
    const { data: result, error } = await supabase.rpc('submit_report', {
      p_barangay_id: data.barangay_id,
      p_category: data.category,
      p_description: data.description || null,
      p_landmark: data.landmark,
      p_latitude: data.latitude || null,
      p_longitude: data.longitude || null,
      p_device_hash: deviceHash,
      p_contact_number: data.contact_number && data.contact_number.trim() !== '' ? data.contact_number : null,
      p_consent: Boolean(data.consent),
    })

    if (error) {
      // Check for rate limit error from database trigger/RPC
      if (error.message?.includes('Rate Limit Exceeded') || error.message?.includes('WR04')) {
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            details: [error.message],
          },
          { status: 429, headers: { 'Retry-After': '3600' } }
        )
      }

      console.error('submit_report RPC error:', error)
      return NextResponse.json(
        {
          error: 'Database Error',
          details: [error.message],
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        ticket_token: result?.ticket_token,
        cluster_id: result?.cluster_id,
        status: result?.status,
        message: result?.message || 'Report submitted successfully.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Unexpected error submitting report:', err)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: [err.message || 'An unexpected error occurred.'],
      },
      { status: 500 }
    )
  }
}
