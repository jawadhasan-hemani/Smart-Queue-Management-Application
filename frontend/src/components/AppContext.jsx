import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react"
import { auth, googleProvider, firebaseConfig } from "../firebase"
import { initializeApp } from "firebase/app"
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth"

import { mockServices, mockQueues, mockHistory, mockNotifications } from "../mockData"

const API_BASE = "/api"

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
  const [user, setUserState] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [admins, setAdmins] = useSharedState("qs_admins", ["admin@queuesmart.com"])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let role = (admins.includes(firebaseUser.email) || firebaseUser.email === "admin@queuesmart.com") ? "admin" : "student"
        
        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0].replace(/[._]/g, " "),
              role
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.role) {
              role = data.user.role;
            }
          }
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
        }

        setUserState({
          name: firebaseUser.displayName || firebaseUser.email.split("@")[0].replace(/[._]/g, " "),
          email: firebaseUser.email,
          role: role,
        })
      } else {
        setUserState(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [admins])

  const [services, setServices] = useSharedState("qs_services", mockServices)
  const [queues, setQueues] = useSharedState("qs_queues", mockQueues)
  const [history, setHistory] = useSharedState("qs_history", mockHistory)
  const [notifications, setNotifications] = useSharedState("qs_notifications", mockNotifications)

  // --- Authenticated API helper ---
  // Grabs a fresh Firebase token and makes a JSON request to the backend.
  // Returns the parsed response or throws on non-2xx status.
  const apiFetch = useCallback(async (path, options = {}) => {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) }
    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        const token = await currentUser.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }
    } catch {
      // continue without auth header if token retrieval fails
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.error || `API ${res.status}`), { status: res.status, body })
    }
    return res.json()
  }, [])

  // --- Load services from backend on mount ---
  useEffect(() => {
    apiFetch("/services")
      .then((data) => {
        if (data.services && data.services.length > 0) {
          setServices(data.services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            priority: s.priority,
            open: s.open,
          })))
        }
      })
      .catch((err) => console.error("Failed to load services from backend:", err))
  }, [apiFetch])

  // --- Load queue entries from backend on mount ---
  useEffect(() => {
    apiFetch("/queue")
      .then((data) => {
        if (data.summary) {
          // For each service with entries, load the full queue
          const promises = data.summary
            .filter((s) => s.count > 0)
            .map((s) =>
              apiFetch(`/queue/${s.serviceId}`)
                .then((qData) =>
                  (qData.queue || []).map((entry) => ({
                    id: entry.id,
                    serviceId: s.serviceId,
                    studentName: entry.studentName,
                    joinedAt: new Date(entry.joinedAt).getTime(),
                    priority: entry.priority || "medium",
                  }))
                )
                .catch(() => [])
            )
          return Promise.all(promises).then((results) => {
            const allEntries = results.flat()
            if (allEntries.length > 0) {
              setQueues(allEntries)
            }
          })
        }
      })
      .catch((err) => console.error("Failed to load queues from backend:", err))
  }, [apiFetch])

  // --- Backend integration: History & Notification modules ---
  // Pulls real data from the backend (falls back to whatever is already in
  // shared/local state — the mock seed — if the request fails, so the UI
  // never breaks if the backend isn't running).

  const mapHistoryEntry = useCallback((entry) => ({
    id: entry.id,
    studentName: entry.studentName,
    serviceId: entry.serviceId,
    serviceName: entry.serviceName,
    priority: entry.priority,
    date: new Date(entry.endedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    resolvedAt: new Date(entry.endedAt).getTime(),
    outcome: entry.status === "served" ? "Served" : "Left queue",
    outcomeRaw: entry.status,
    waitMinutes: entry.waitedMinutes,
  }), [])

  const notificationCopy = {
    joined: { title: "Joined queue", tone: "success" },
    near_turn: { title: "Almost your turn", tone: "warning" },
    served: { title: "You've been served", tone: "success" },
    custom: { title: "Notification", tone: "info" },
  }

  const mapNotification = useCallback((n) => ({
    id: n.id,
    title: notificationCopy[n.type]?.title ?? "Notification",
    body: n.message,
    createdAt: new Date(n.createdAt).getTime(),
    read: n.read,
    tone: notificationCopy[n.type]?.tone ?? "info",
  }), [])

  useEffect(() => {
    const query = user?.name ? `?studentName=${encodeURIComponent(user.name)}` : ""

    apiFetch(`/history${query}`)
      .then((data) => setHistory(data.history.map(mapHistoryEntry)))
      .catch((err) => console.error("Failed to load history from backend:", err))

    apiFetch(`/notifications${query}`)
      .then((data) => setNotifications(data.notifications.map(mapNotification)))
      .catch((err) => console.error("Failed to load notifications from backend:", err))
  }, [user?.name, mapHistoryEntry, mapNotification, apiFetch])

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

  const login = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const register = useCallback(async (name, email, password) => {
    await createUserWithEmailAndPassword(auth, email, password)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const addAdmin = useCallback(async (email) => {
    if (admins.includes(email)) return
    
    // Initialize a secondary app to create a user without logging out the current admin
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp-" + Date.now())
    const { getAuth } = await import("firebase/auth");
    const secAuth = getAuth(secondaryApp);
    
    try {
      const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD || "QueueSmart2026!";
      await createUserWithEmailAndPassword(secAuth, email, adminPassword)
    } catch (err) {
      if (err.code !== "auth/email-already-in-use") {
        throw err;
      }
    }
    setAdmins(prev => [...prev, email])
  }, [admins, setAdmins])

  const removeAdmin = useCallback((email) => {
    if (email === "admin@queuesmart.com") return // Protect master account
    setAdmins(prev => prev.filter(e => e !== email))
  }, [setAdmins])

  const saveService = useCallback(
    async (service) => {
      // Optimistic local update first
      const isUpdate = service.id && services.some((s) => s.id === service.id)
      const tempId = nextId("svc")

      if (isUpdate) {
        setServices((prev) => prev.map((s) => (s.id === service.id ? { ...service } : s)))
      } else {
        setServices((prev) => [...prev, { ...service, id: tempId }])
      }

      try {
        if (isUpdate) {
          const data = await apiFetch(`/services/${service.id}`, {
            method: "PUT",
            body: JSON.stringify({
              name: service.name,
              description: service.description,
              duration: service.duration,
              priority: service.priority,
              open: service.open,
            }),
          })
          if (data.service) {
            setServices((prev) =>
              prev.map((s) => (s.id === service.id ? { ...data.service } : s))
            )
          }
        } else {
          const data = await apiFetch("/services", {
            method: "POST",
            body: JSON.stringify({
              name: service.name,
              description: service.description,
              duration: service.duration,
              priority: service.priority,
              open: service.open ?? true,
            }),
          })
          if (data.service) {
            // Replace the temp-id entry with the real one from the backend
            setServices((prev) =>
              prev.map((s) => (s.id === tempId ? { ...data.service } : s))
            )
          }
        }
      } catch (err) {
        console.error("Failed to save service to backend:", err)
        // Keep the optimistic update — the UI stays consistent
      }
    },
    [services, apiFetch],
  )

  const toggleServiceOpen = useCallback(async (id) => {
    const current = services.find((s) => s.id === id)
    if (!current) return

    // Optimistic update
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, open: !s.open } : s)))

    try {
      await apiFetch(`/services/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: current.name,
          description: current.description,
          duration: current.duration,
          priority: current.priority,
          open: !current.open,
        }),
      })
    } catch (err) {
      console.error("Failed to toggle service open status:", err)
    }
  }, [services, apiFetch])

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
    async (serviceId) => {
      if (!user) return
      const svc = services.find((s) => s.id === serviceId)
      const tempId = nextId("q")

      // Optimistic local insert
      setQueues((prev) => {
        const filtered = prev.filter((q) => q.studentName !== user.name)
        return [
          ...filtered,
          {
            id: tempId,
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

      try {
        const data = await apiFetch(`/queue/${serviceId}/join`, {
          method: "POST",
          body: JSON.stringify({
            studentName: user.name,
            priority: "medium",
          }),
        })
        if (data.entry) {
          // Replace temp entry with the real one
          setQueues((prev) =>
            prev.map((q) =>
              q.id === tempId
                ? {
                    id: data.entry.id,
                    serviceId,
                    studentName: data.entry.studentName,
                    joinedAt: data.entry.joinedAt ? new Date(data.entry.joinedAt).getTime() : Date.now(),
                    priority: data.entry.priority || "medium",
                  }
                : q
            )
          )
        }
      } catch (err) {
        console.error("Failed to join queue via backend:", err)
      }
    },
    [user, services, pushNotification, apiFetch],
  )

  const leaveQueue = useCallback(async () => {
    if (!user) return
    const entry = queues.find((q) => q.studentName === user.name)

    // Optimistic local removal
    setQueues((prev) => prev.filter((q) => q.studentName !== user.name))
    pushNotification({
      title: "Left the queue",
      body: "You've been removed from the line. You can rejoin any time.",
      tone: "info",
    })

    if (entry) {
      try {
        await apiFetch(`/queue/${entry.serviceId}/leave/${entry.id}`, {
          method: "DELETE",
        })
      } catch (err) {
        console.error("Failed to leave queue via backend:", err)
      }
    }
  }, [user, queues, pushNotification, apiFetch])

  const serveNext = useCallback(
    async (serviceId) => {
      const ordered = orderedQueue(serviceId)
      const next = ordered[0]
      if (!next) return

      // Optimistic local removal
      setQueues((prev) => prev.filter((q) => q.id !== next.id))
      pushNotification({
        title: "Now serving",
        body: `${next.studentName} is now being served.`,
        tone: "success",
      })

      try {
        await apiFetch(`/queue/${serviceId}/serve`, {
          method: "POST",
        })
      } catch (err) {
        console.error("Failed to serve next via backend:", err)
      }
    },
    [orderedQueue, pushNotification, apiFetch],
  )

  const removeEntry = useCallback(
    async (entryId) => {
      const entry = queues.find((q) => q.id === entryId)

      // Optimistic local removal
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

      if (entry) {
        try {
          await apiFetch(`/queue/${entry.serviceId}/leave/${entryId}`, {
            method: "DELETE",
          })
        } catch (err) {
          console.error("Failed to remove entry via backend:", err)
        }
      }
    },
    [user, queues, services, pushNotification, apiFetch],
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
    setNotifications((prev) => {
      const unreadIds = prev.filter((n) => !n.read).map((n) => n.id)
      unreadIds.forEach((id) => {
        apiFetch(`/notifications/${id}/read`, { method: "PATCH" }).catch((err) =>
          console.error("Failed to mark notification read on backend:", err),
        )
      })
      return prev.map((n) => ({ ...n, read: true }))
    })
  }, [apiFetch])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      admins,
      services,
      queues,
      history,
      notifications,
      login,
      register,
      loginWithGoogle,
      logout,
      addAdmin,
      removeAdmin,
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
      authLoading,
      admins,
      services,
      queues,
      history,
      notifications,
      login,
      register,
      loginWithGoogle,
      logout,
      addAdmin,
      removeAdmin,
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