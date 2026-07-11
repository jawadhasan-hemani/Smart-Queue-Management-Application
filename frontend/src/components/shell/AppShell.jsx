import React from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Users } from "lucide-react"
import { useApp } from "../AppContext"
import { NotificationsMenu } from "./NotificationsMenu"
import { Toaster } from "./Toaster"

export function AppShell({ nav, active, onNavigate, title, subtitle, children }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-svh bg-background">
      <Toaster />
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Users className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">QueueSmart</p>
            <p className="text-[11px] text-sidebar-foreground/60 capitalize">{user?.role || 'student'} portal</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active === key
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="size-[18px]" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-4 rounded-xl bg-sidebar-accent p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{user?.name || 'Student'}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{user?.email || 'student@uh.edu'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-sidebar/60 py-2 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationsMenu />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1.5 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
          {nav.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
