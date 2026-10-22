import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Droplet,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Truck,
  RotateCcw,
} from 'lucide-react'

export const instant = false

interface TicketPageProps {
  params: Promise<{ code: string }>
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { code: rawCode } = await params
  const ticketToken = decodeURIComponent(rawCode).trim().toUpperCase()

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Call get_ticket_status RPC (Zero PII - Rule WR07)
  const { data: ticket, error } = await supabase.rpc('get_ticket_status', {
    p_ticket_token: ticketToken,
  })

  // Format date in Asia/Manila
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Pending'
    try {
      const date = new Date(isoString)
      return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date)
    } catch {
      return isoString
    }
  }

  const renderStatusBadge = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Verified by Barangay</span>
          </span>
        )
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Relief Tanker Dispatched</span>
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Droplet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Water Service Restored</span>
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            <RotateCcw className="w-4 h-4 text-zinc-500" />
            <span>Closed / Unverified</span>
          </span>
        )
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Submitted — Queued for Triage</span>
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Status Board</span>
          </Link>

          <Link href="/report" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Report Another Outage
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!ticket || ticket.found === false ? (
          /* TICKET NOT FOUND STATE */
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Ticket Not Found</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No incident report was found with token <code className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{ticketToken}</code>.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/report"
                className="inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Return to Report Desk
              </Link>
            </div>
          </div>
        ) : (
          /* TICKET FOUND STATE */
          <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            {/* Header Token & Status */}
            <div className="space-y-3 pb-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Incident Reference Token
                  </span>
                  <p className="font-mono text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-wider">
                    {ticket.ticket_token}
                  </p>
                </div>
                <div>{renderStatusBadge(ticket.status)}</div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-400">Barangay:</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {ticket.barangay}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400">District:</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-200">{ticket.district || 'Iloilo City'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400">Report Category:</span>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                  {ticket.category ? ticket.category.replace('_', ' ') : 'Outage'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400">Submitted At:</span>
                <p className="font-mono text-zinc-700 dark:text-zinc-300">{formatTime(ticket.submitted_at)}</p>
              </div>
            </div>

            {/* Privacy Shield Notice (Rule WR07) */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Privacy Shield Active (Rule WR07)</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Specific street landmarks, coordinates, and contact details are shielded from public tracking URLs to prevent citizen doxxing under RA 10173. Authorized Barangay Officials access localized details on their authenticated triage portal.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link
                href="/"
                className="flex-1 py-2.5 px-4 text-center rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Back to Status Board
              </Link>
              <Link
                href="/report"
                className="flex-1 py-2.5 px-4 text-center rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Submit Another Report
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

