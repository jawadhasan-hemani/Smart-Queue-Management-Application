import React, { useEffect, useRef, useState } from "react"
import { Bell, CheckCircle2, Info, TriangleAlert } from "lucide-react"
import { useApp } from "../AppContext"
import { relativeTime } from "../shared"

const toneIcon = {
  info: { Icon: Info, cls: "text-primary" },
  success: { Icon: CheckCircle2, cls: "text-[oklch(0.5_0.12_145)]" },
  warning: { Icon: TriangleAlert, cls: "text-[oklch(0.55_0.13_65)]" },
}

export function NotificationsMenu() {
  const { notifications, markNotificationsRead } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function toggle() {
    setOpen((o) => {
      const next = !o
      if (next && unread > 0) markNotificationsRead()
      return next
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <span className="text-xs text-muted-foreground">{notifications.length} total</span>
          </div>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</li>
            )}
            {notifications.map((n) => {
              const { Icon, cls } = toneIcon[n.tone]
              return (
                <li key={n.id} className="flex gap-3 px-4 py-3">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${cls}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{relativeTime(n.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
