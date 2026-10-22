"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Droplet,
  PlusCircle,
  BarChart3,
  FileText,
  Lock,
  Menu,
  Shield,
  HelpCircle,
} from "lucide-react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function PublicHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: "/", label: "Status Board", icon: Droplet },
    { href: "/report", label: "Report Outage", icon: PlusCircle, isPrimary: true },
    { href: "/index", label: "Delivery Index", icon: BarChart3 },
    { href: "/methodology", label: "Methodology", icon: FileText },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-sky-600 group-hover:bg-sky-700 transition-colors flex items-center justify-center text-white shadow-xs">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-50">
                OWTA
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Iloilo
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
              Open Water Transparency Architecture
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors ml-1"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1.5" aria-hidden="true" />

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Staff Portal</span>
          </Link>
        </nav>

        {/* Mobile Navigation Drawer Trigger */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/report"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report</span>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72 p-6 flex flex-col justify-between">
              <div>
                <SheetHeader className="mb-6 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                      <Droplet className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <SheetTitle className="text-base font-bold text-slate-900 dark:text-slate-50">
                        OWTA Iloilo
                      </SheetTitle>
                      <p className="text-xs text-slate-500">Public Water Transparency</p>
                    </div>
                  </div>
                </SheetHeader>

                <nav className="flex flex-col gap-1">
                  {navLinks.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}

                  <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Staff Authentication</span>
                  </Link>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                <p>© 2026 OWTA Iloilo City</p>
                <p className="mt-0.5">RA 10173 Statutory Privacy Compliant</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
