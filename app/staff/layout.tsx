import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Droplet, Shield, LogOut, ClipboardList, Truck, Calendar, AlertTriangle } from 'lucide-react'

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
    <div className="min-h-screen bg-zinc-50/60 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Staff Global Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/staff/reports" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
                <Shield className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
                  OWTA Staff Desk
                </span>
                <span className="hidden md:inline text-xs text-zinc-400 dark:text-zinc-500 ml-2 font-medium">
                  Operational Triage & Dispatch
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/staff/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Incident Triage</span>
              </Link>

              {isDispatcherOrAdmin && (
                <Link
                  href="/staff/relief"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Relief Priority</span>
                </Link>
              )}

              {isOperatorOrAdmin && (
                <Link
                  href="/staff/schedules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Schedules</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Badge & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-[11px] text-zinc-500 capitalize">
                {role.replace('_', ' ')} {barangayName ? `• ${barangayName}` : ''}
              </p>
            </div>

            <form action={handleSignOut}>
              <button
                type="submit"
                title="Sign Out"
                className="p-2 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pending Administrative Staff Verification</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
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

