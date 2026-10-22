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
  Copy,
  ExternalLink,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Verified by Barangay</span>
          </span>
        )
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
            <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Relief Tanker Dispatched</span>
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <Droplet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Water Service Restored</span>
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700">
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Closed / Unverified</span>
          </span>
        )
      case 'submitted':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Queued for Field Triage</span>
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Universal Public Navigation Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/report"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Submit another report</span>
        </Link>

        {error || !ticket ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Ticket Not Found
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              We could not find an incident report matching code <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ticketToken}</span>.
              Please verify your reference token and try again.
            </p>
            <div className="pt-2">
              <Link
                href="/report"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
              >
                Return to Reporting Desk
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ticket Header Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Incident Tracking Code
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-50">
                      {ticket.ticket_token}
                    </h1>
                  </div>
                </div>
                <div>{renderStatusBadge(ticket.status)}</div>
              </div>

              {/* Progress Stepper */}
              <div className="py-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Resolution Lifecycle
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">1. Received</span>
                  </div>
                  <div className="space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        ticket.cluster_count > 0 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    ></div>
                    <span
                      className={`text-[11px] ${
                        ticket.cluster_count > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      2. Clustered ({ticket.cluster_count || 1})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        ticket.status === 'verified' || ticket.status === 'dispatched' || ticket.status === 'resolved'
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    ></div>
                    <span
                      className={`text-[11px] ${
                        ticket.status === 'verified' || ticket.status === 'dispatched' || ticket.status === 'resolved'
                          ? 'font-semibold text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      3. Verified
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        ticket.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    ></div>
                    <span
                      className={`text-[11px] ${
                        ticket.status === 'resolved' ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      4. Restored
                    </span>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Jurisdiction:</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {ticket.barangay_name} ({ticket.district_name})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Incident Category:</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 uppercase tracking-wide">
                    {ticket.category.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">First Reported:</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatTime(ticket.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Barangay Verification:</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatTime(ticket.verified_at)}
                  </p>
                </div>
              </div>

              {ticket.landmark && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500">Reported Landmark:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{ticket.landmark}</p>
                </div>
              )}
            </div>

            {/* Statutory Privacy & Transparency Note */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Statutory Data Privacy Disclosure (RA 10173 & Rule WR07)</span>
              </div>
              <p className="leading-relaxed">
                OWTA does not expose reporter phone numbers, personal identifiers, or exact household coordinates. This status view is accessible exclusively via your random reference token.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p>© 2026 OWTA Iloilo</p>
          <Link href="/" className="hover:underline">
            View Citywide Status Board
          </Link>
        </div>
      </footer>
    </div>
  )
}
