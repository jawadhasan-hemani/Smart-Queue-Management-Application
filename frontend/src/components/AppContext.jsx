import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react"

import { mockServices, mockQueues, mockHistory, mockNotifications } from "../mockData"

const priorityRank = { high: 0, medium: 1, low: 2 }

let idCounter = 100
const nextId = (prefix) => `${prefix}-${++idCounter}`

const AppCtx = createContext(null)

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

function useSharedState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === key && e.newValue) {
        setState(JSON.parse(e.newValue))
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [key])

  const setSharedState = useCallback((value) => {
    setState((prev) => {
      const nextValue = typeof value === "function" ? value(prev) : value
      window.localStorage.setItem(key, JSON.stringify(nextValue))
      return nextValue
    })
  }, [key])

  return [state, setSharedState]
}

export function AppProvider({ children }) {
  const [user, setUserState] = useState(() => {
    try {
      const u = window.sessionStorage.getItem("qs_user")
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })

  const setUser = useCallback((val) => {
    setUserState((prev) => {
      const next = typeof val === "function" ? val(prev) : val
      if (next) window.sessionStorage.setItem("qs_user", JSON.stringify(next))
      else window.sessionStorage.removeItem("qs_user")
      return next
    })
  }, [])

  const [services, setServices] = useSharedState("qs_services", mockServices)
  const [queues, setQueues] = useSharedState("qs_queues", mockQueues)
  const [history, setHistory] = useSharedState("qs_history", mockHistory)
  const [notifications, setNotifications] = useSharedState("qs_notifications", mockNotifications)

  // Per-device notification preferences (not shared across tabs/users on purpose)
  const [muteToasts, setMuteToastsState] = useState(() => {
    try {
      return window.localStorage.getItem("qs_mute_toasts") === "true"
    } catch {
      return false
    }
  })

  const setMuteToasts = useCallback((val) => {
    setMuteToastsState((prev) => {
      const next = typeof val === "function" ? val(prev) : val
      try {
        window.localStorage.setItem("qs_mute_toasts", String(next))
      } catch {
        // ignore storage errors (e.g. private browsing)
      }
      return next
    })
  }, [])

  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  )

  const requestPushPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported"
    const result = await Notification.requestPermission()
    setPushPermission(result)
    return result
  }, [])

  const pushNotification = useCallback(
    (n) => {
      setNotifications((prev) => [
        { ...n, id: nextId("n"), createdAt: Date.now(), read: false },
        ...prev,
      ])

      // Fire a native browser notification when the tab isn't focused and permission is granted
      try {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          document.hidden
        ) {
          new Notification(n.title, { body: n.body })
        }
      } catch {
        // Notification API can throw in some environments (e.g. insecure context) — ignore
      }
    },
    [],
  )

  const login = useCallback((email, role, name) => {
    const derived = name || email.split("@")[0].replace(/[._]/g, " ")
    setUser({
      name: derived.replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      role,
    })
  }, [])

  const register = useCallback((name, email) => {
    setUser({ name, email, role: "student" })
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const saveService = useCallback(
    (service) => {
      setServices((prev) => {
        if (service.id && prev.some((s) => s.id === service.id)) {
          return prev.map((s) => (s.id === service.id ? { ...service } : s))
        }
        return [...prev, { ...service, id: nextId("svc") }]
      })
    },
    [],
  )

  const toggleServiceOpen = useCallback((id) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, open: !s.open } : s)))
  }, [])

  const orderedQueue = useCallback(
    (serviceId) =>
      queues
        .filter((q) => q.serviceId === serviceId)
        .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.joinedAt - b.joinedAt),
    [queues],
  )

  const estimatedWait = useCallback(
    (serviceId, position) => {
      const svc = services.find((s) => s.id === serviceId)
      const duration = svc?.duration ?? 10
      return Math.max(0, (position - 1) * duration)
    },
    [services],
  )

  const myEntry = useCallback(() => {
    if (!user) return null
    const entry = queues.find((q) => q.studentName === user.name)
    if (!entry) return null
    const service = services.find((s) => s.id === entry.serviceId)
    if (!service) return null
    const ordered = orderedQueue(entry.serviceId)
    const position = ordered.findIndex((q) => q.id === entry.id) + 1
    const wait = estimatedWait(entry.serviceId, position)
    const status = position === 1 ? "almost" : "waiting"
    return { entry, service, position, wait, status }
  }, [user, queues, services, orderedQueue, estimatedWait])

  const myCurrentEntry = myEntry()
  const currentPosition = myCurrentEntry?.position

  const prevPosRef = React.useRef(currentPosition)
  
  React.useEffect(() => {
    if (currentPosition && prevPosRef.current && currentPosition < prevPosRef.current) {
      pushNotification({
        title: "Queue Update",
        body: `You've moved up! You are now position #${currentPosition}.`,
        tone: "info"
      })
    }
    prevPosRef.current = currentPosition
  }, [currentPosition, pushNotification])

  const joinQueue = useCallback(
    (serviceId) => {
      if (!user) return
      const svc = services.find((s) => s.id === serviceId)
      setQueues((prev) => {
        const filtered = prev.filter((q) => q.studentName !== user.name)
        return [
          ...filtered,
          {
            id: nextId("q"),
            serviceId,
            studentName: user.name,
            joinedAt: Date.now(),
            priority: "medium",
          },
        ]
      })
      pushNotification({
        title: "Joined queue",
        body: `You're in line for ${svc?.name ?? "a service"}. We'll alert you as your turn nears.`,
        tone: "success",
      })
    },
    [user, services, pushNotification],
  )

  const leaveQueue = useCallback(() => {
    if (!user) return
    setQueues((prev) => prev.filter((q) => q.studentName !== user.name))
    pushNotification({
      title: "Left the queue",
      body: "You've been removed from the line. You can rejoin any time.",
      tone: "info",
    })
  }, [user, pushNotification])

  const serveNext = useCallback(
    (serviceId) => {
      const ordered = orderedQueue(serviceId)
      const next = ordered[0]
      if (!next) return
      setQueues((prev) => prev.filter((q) => q.id !== next.id))
      pushNotification({
        title: "Now serving",
        body: `${next.studentName} is now being served.`,
        tone: "success",
      })
    },
    [orderedQueue, pushNotification],
  )

  const removeEntry = useCallback(
    (entryId) => {
      setQueues((prev) => {
        const removed = prev.find((q) => q.id === entryId)
        if (removed && user && removed.studentName === user.name) {
          const svc = services.find((s) => s.id === removed.serviceId)
          pushNotification({
            title: "Removed from queue",
            body: `You were removed from the ${svc?.name ?? "service"} line by staff.`,
            tone: "danger",
          })
        }
        return prev.filter((q) => q.id !== entryId)
      })
    },
    [user, services, pushNotification],
  )

  const moveEntry = useCallback(
    (entryId, direction) => {
      setQueues((prev) => {
        const entry = prev.find((q) => q.id === entryId)
        if (!entry) return prev
        const group = prev
          .filter((q) => q.serviceId === entry.serviceId)
          .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.joinedAt - b.joinedAt)
        const idx = group.findIndex((q) => q.id === entryId)
        const swapIdx = direction === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= group.length) return prev
        const a = group[idx]
        const b = group[swapIdx]
        return prev.map((q) => {
          if (q.id === a.id) return { ...q, joinedAt: b.joinedAt, priority: b.priority }
          if (q.id === b.id) return { ...q, joinedAt: a.joinedAt, priority: a.priority }
          return q
        })
      })
    },
    [],
  )

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      user,
      services,
      queues,
      history,
      notifications,
      login,
      register,
      logout,
      saveService,
      toggleServiceOpen,
      orderedQueue,
      myEntry,
      joinQueue,
      leaveQueue,
      serveNext,
      removeEntry,
      moveEntry,
      estimatedWait,
      markNotificationsRead,
      clearNotifications,
      dismissNotification,
      pushNotification,
      muteToasts,
      setMuteToasts,
      pushPermission,
      requestPushPermission,
    }),
    [
      user,
      services,
      queues,
      history,
      notifications,
      login,
      register,
      logout,
      saveService,
      toggleServiceOpen,
      orderedQueue,
      myEntry,
      joinQueue,
      leaveQueue,
      serveNext,
      removeEntry,
      moveEntry,
      estimatedWait,
      markNotificationsRead,
      clearNotifications,
      dismissNotification,
      pushNotification,
      muteToasts,
      setMuteToasts,
      pushPermission,
      requestPushPermission,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
