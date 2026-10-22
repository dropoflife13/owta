import React from "react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 font-sans flex flex-col">
      {/* Top Bar Skeleton */}
      <div className="w-full bg-slate-900 border-b border-slate-800 py-1.5 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-3 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="w-full h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-6">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Skeleton */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Banner Skeleton */}
        <div className="rounded-3xl bg-slate-900 p-8 sm:p-10 border border-slate-800 space-y-4">
          <div className="h-4 w-40 bg-slate-800 rounded-full animate-pulse" />
          <div className="h-8 w-3/4 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-800/80 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Big Card Skeleton */}
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </main>
    </div>
  )
}
