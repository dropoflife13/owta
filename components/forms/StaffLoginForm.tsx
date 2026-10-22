"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Lock, Mail, ShieldAlert, CheckCircle2, Loader2, UserCheck, ArrowRight } from "lucide-react"

interface DemoAccount {
  label: string
  roleName: string
  email: string
  password: string
  meta: {
    role: string
    assigned_barangay_id?: string
    first_name: string
    last_name: string
    is_verified: boolean
  }
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "San Rafael Official",
    roleName: "Barangay Official (San Rafael)",
    email: "official.sanrafael@owta.iloilo.gov.ph",
    password: "IloiloWater2026!",
    meta: {
      role: "barangay_official",
      assigned_barangay_id: "b0000000-0000-0000-0000-000000000001",
      first_name: "San Rafael",
      last_name: "Focal Person",
      is_verified: true,
    },
  },
  {
    label: "Bolilao Official",
    roleName: "Barangay Official (Bolilao)",
    email: "official.bolilao@owta.iloilo.gov.ph",
    password: "IloiloWater2026!",
    meta: {
      role: "barangay_official",
      assigned_barangay_id: "b0000000-0000-0000-0000-000000000002",
      first_name: "Bolilao",
      last_name: "Focal Person",
      is_verified: true,
    },
  },
  {
    label: "CDRRMO Dispatcher",
    roleName: "LGU Dispatcher (Citywide)",
    email: "dispatcher.cdrrmo@owta.iloilo.gov.ph",
    password: "IloiloWater2026!",
    meta: {
      role: "lgu_dispatcher",
      first_name: "CDRRMO",
      last_name: "Relief Officer",
      is_verified: true,
    },
  },
  {
    label: "System Admin",
    roleName: "Administrator",
    email: "admin.sys@owta.iloilo.gov.ph",
    password: "IloiloWater2026!",
    meta: {
      role: "admin",
      first_name: "System",
      last_name: "Administrator",
      is_verified: true,
    },
  },
]

export function StaffLoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Quick fill demo account
  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setErrorMsg(null)
  }

  // Handle Login & Auto-Provision Demo Account if Not Found
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      // 1. Attempt standard signIn
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (!signInError && signInData?.session) {
        setStatusMsg("Authentication successful! Redirecting to triage desk...")
        router.push("/staff/reports")
        router.refresh()
        return
      }

      // 2. If user not found, check if it's one of the configured demo accounts to auto-provision
      const matchedDemo = DEMO_ACCOUNTS.find((d) => d.email === cleanEmail)
      if (matchedDemo && (signInError?.message?.includes("Invalid login") || signInError?.message?.includes("credentials"))) {
        setStatusMsg("Initializing verified demonstration account in Supabase...")

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: matchedDemo.meta,
          },
        })

        if (signUpError) {
          setErrorMsg(signUpError.message)
          setLoading(false)
          return
        }

        if (signUpData?.session) {
          setStatusMsg("Account initialized and verified! Loading triage desk...")
          router.push("/staff/reports")
          router.refresh()
          return
        } else {
          // In case email confirmation is required on Supabase Project settings
          // try signing in once more
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })
          if (!retryError) {
            router.push("/staff/reports")
            router.refresh()
            return
          }
        }
      }

      if (signInError) {
        setErrorMsg(signInError.message)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected login error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Login Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Staff & Official Sign In</h1>
          <p className="text-xs text-zinc-500">
            Role-Based Triage Portal for Barangay Officials, CDRRMO Dispatchers, and Utility Operators.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@owta.iloilo.gov.ph"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Staff Desk</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Fill Selector */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center">
            Demo & Review Fast-Fill
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className="p-2 text-left rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{acc.label}</p>
                <p className="text-[10px] text-zinc-500 truncate">{acc.roleName}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

