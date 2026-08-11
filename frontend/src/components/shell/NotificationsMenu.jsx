import React, { useEffect, useRef, useState } from "react"
import { Bell, BellOff, CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react"
import { useApp } from "../AppContext"
import { relativeTime } from "../shared"

const toneIcon = {
  info: { Icon: Info, cls: "text-primary" },
  success: { Icon: CheckCircle2, cls: "text-[oklch(0.5_0.12_145)]" },
  warning: { Icon: TriangleAlert, cls: "text-[oklch(0.55_0.13_65)]" },
  danger: { Icon: XCircle, cls: "text-[oklch(0.55_0.18_25)]" },
}

export function NotificationsMenu() {
  const {
    notifications,
    markNotificationsRead,
    clearNotifications,
    dismissNotification,
    muteToasts,
    setMuteToasts,
    pushPermission,
    requestPushPermission,
  } = useApp()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // drives the CSS transition
  const ref = useRef(null)
  const unread = notifications.filter((n) => !n.read).length

  // Two-phase open: mount the DOM (`open`) then trigger the CSS transition (`visible`)
  useEffect(() => {
    if (open) {
      // Let the browser paint the element at scale-95/opacity-0 first, then flip to visible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
    }
  }, [open])

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
        <div
          className={`absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg
            transition-all duration-200 ease-out origin-top-right
            ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-1'}
          `}
          onTransitionEnd={() => {
            // After the close animation finishes, unmount
            if (!visible) setOpen(false)
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground">{notifications.length} total</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
            <button
              type="button"
              onClick={() => setMuteToasts((m) => !m)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {muteToasts ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
              {muteToasts ? "Toasts muted" : "Mute toasts"}
            </button>
            {pushPermission !== "granted" && pushPermission !== "unsupported" && (
              <button
                type="button"
                onClick={requestPushPermission}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Enable desktop alerts
              </button>
            )}
            {pushPermission === "granted" && (
              <span className="text-[11px] text-muted-foreground">Desktop alerts on</span>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</li>
            )}
            {notifications.map((n, i) => {
              const { Icon, cls } = toneIcon[n.tone]
              return (
                <li
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 transition-all duration-200 ease-out
                    ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
                  `}
                  style={{ transitionDelay: visible ? `${Math.min(i * 30, 150)}ms` : '0ms' }}
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${cls}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{relativeTime(n.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissNotification(n.id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 rounded-lg p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
