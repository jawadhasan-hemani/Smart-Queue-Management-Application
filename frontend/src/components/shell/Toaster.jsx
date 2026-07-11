import React, { useEffect, useRef, useState } from "react"
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react"
import { useApp } from "../AppContext"

const toneStyles = {
  info: { Icon: Info, iconCls: "text-primary", ringCls: "border-primary/30" },
  success: {
    Icon: CheckCircle2,
    iconCls: "text-[oklch(0.5_0.12_145)]",
    ringCls: "border-[oklch(0.62_0.13_145)]/40",
  },
  warning: {
    Icon: TriangleAlert,
    iconCls: "text-[oklch(0.55_0.13_65)]",
    ringCls: "border-[oklch(0.72_0.14_75)]/40",
  },
  danger: {
    Icon: XCircle,
    iconCls: "text-[oklch(0.55_0.18_25)]",
    ringCls: "border-[oklch(0.62_0.18_25)]/40",
  },
}

const TOAST_DURATION_MS = 5000

export function Toaster() {
  const { notifications } = useApp()
  const [toasts, setToasts] = useState([])
  const seenIds = useRef(new Set())
  const isFirstRun = useRef(true)

  useEffect(() => {
    // Don't toast whatever mock notifications already exist when the app first loads
    if (isFirstRun.current) {
      notifications.forEach((n) => seenIds.current.add(n.id))
      isFirstRun.current = false
      return
    }

    const fresh = notifications.filter((n) => !seenIds.current.has(n.id))
    if (fresh.length === 0) return

    fresh.forEach((n) => seenIds.current.add(n.id))
    setToasts((prev) => [...fresh.map((n) => ({ ...n, visible: false })), ...prev])

    // Trigger the enter transition on the next frame
    requestAnimationFrame(() => {
      setToasts((prev) => prev.map((t) => (fresh.some((f) => f.id === t.id) ? { ...t, visible: true } : t)))
    })

    fresh.forEach((n) => {
      setTimeout(() => dismiss(n.id), TOAST_DURATION_MS)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  function dismiss(id) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((n) => {
        const { Icon, iconCls, ringCls } = toneStyles[n.tone] || toneStyles.info
        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg transition-all duration-200 ease-out ${ringCls} ${
              n.visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${iconCls}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{n.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(n.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
