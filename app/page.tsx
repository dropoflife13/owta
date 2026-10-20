import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const instant = false

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="max-w-md w-full p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 mb-4 text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Supabase Environment Variables Required
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Vercel needs your Supabase project keys to connect to the database.
          </p>
          <div className="mt-4 p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-left text-xs font-mono space-y-1">
            <p className="text-zinc-500">// Add in Vercel Project Settings &gt; Environment Variables:</p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">NEXT_PUBLIC_SUPABASE_URL</p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
          </div>
        </div>
      </main>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: barangays, error } = await supabase
    .from('barangays')
    .select('code, name')
    .limit(10)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="max-w-lg w-full p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💧</span>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">OWTA Water Tracker</h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Supabase Connected</p>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg">
            Notice: {error.message}
          </p>
        ) : (
          <div className="mt-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Seeded Barangays ({barangays?.length || 0})
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {barangays && barangays.length > 0 ? (
                barangays.map((b) => (
                  <li key={b.code} className="py-2 flex justify-between">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{b.name}</span>
                    <span className="text-xs font-mono text-zinc-400">{b.code}</span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-zinc-500 text-xs">No barangays found.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
