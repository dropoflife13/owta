import Link from 'next/link'
import { StaffLoginForm } from '@/components/forms/StaffLoginForm'
import { ArrowLeft, Droplet } from 'lucide-react'

export const instant = false

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Status Board</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900">
              <Droplet className="w-4 h-4 fill-current" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              OWTA Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
        <StaffLoginForm />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 text-xs text-center text-zinc-400">
        <div className="max-w-4xl mx-auto px-4">
          Government & Concessionaire Staff Access Portal • Authorized Personnel Only
        </div>
      </footer>
    </div>
  )
}

