import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [services, setServices] = useState(mockServices)
  const [queues, setQueues] = useState(mockQueues)
  const [history] = useState(mockHistory)
  const [notifications, setNotifications] = useState(mockNotifications)

  const pushNotification = useCallback(
    (n) => {
      setNotifications((prev) => [
        { ...n, id: nextId("n"), createdAt: Date.now(), read: false },
        ...prev,
      ])
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

  const removeEntry = useCallback((entryId) => {
    setQueues((prev) => prev.filter((q) => q.id !== entryId))
  }, [])

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
      pushNotification,
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
      pushNotification,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
