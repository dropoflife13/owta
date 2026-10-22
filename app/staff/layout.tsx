import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Droplet, Shield, LogOut, ClipboardList, Truck, Calendar, AlertTriangle, Menu } from 'lucide-react'

export const instant = false

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    .select('role, is_verified, assigned_barangay_id, first_name, last_name, barangays(name)')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'resident'
  const isVerified = Boolean(profile?.is_verified)
  const barangayName = (profile as any)?.barangays?.name || null

  const isDispatcherOrAdmin = role === 'lgu_dispatcher' || role === 'admin'
  const isOperatorOrAdmin = role === 'utility_operator' || role === 'admin'

  const handleSignOut = async () => {
    'use server'
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 font-sans flex flex-col">
      {/* Staff Global Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/staff/reports" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-50">
                  OWTA Staff Desk
                </span>
                <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500 ml-2 font-medium">
                  Operational Triage &amp; Dispatch
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/staff/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Incident Triage</span>
              </Link>

              {isDispatcherOrAdmin && (
                <Link
                  href="/staff/relief"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Truck className="w-4 h-4 text-sky-600" />
                  <span>Relief Priority</span>
                </Link>
              )}

              {isOperatorOrAdmin && (
                <Link
                  href="/staff/schedules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Schedules</span>
                </Link>
              )}

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors ml-2"
              >
                <Droplet className="w-3.5 h-3.5 text-slate-400" />
                <span>Public View</span>
              </Link>
            </nav>
          </div>

          {/* User Badge & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {profile?.first_name || 'Staff'} {profile?.last_name || 'Member'}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                {role.replace('_', ' ')} {barangayName ? `• ${barangayName}` : ''}
              </p>
            </div>

            <form action={handleSignOut}>
              <button
                type="submit"
                title="Sign Out"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Unverified Warning (Rule WR06) */}
        {(!isVerified || role === 'resident') && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">Pending Administrative Staff Verification</p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Pursuant to municipal security rules, new staff accounts default to resident privileges until an administrator verifies your appointment. RLS policies will restrict localized incident triage actions until verification is active.
              </p>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
