import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarPlus, History as HistoryIcon, LayoutDashboard, MapPin } from "lucide-react"
import { AppShell } from "../../components/shell/AppShell"
import { History } from "./History"
import { JoinQueue } from "./JoinQueue"
import { QueueStatus } from "./QueueStatus"
import { StudentDashboard } from "./StudentDashboard"
import { useApp } from "../../components/AppContext"

const nav = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "join", label: "Join Queue", icon: CalendarPlus },
  { key: "status", label: "Queue Status", icon: MapPin },
  { key: "history", label: "History", icon: HistoryIcon },
]

const meta = {
  dashboard: { title: "Dashboard", subtitle: "Your advising queues at a glance" },
  join: { title: "Join a Queue", subtitle: "Browse available advising services" },
  status: { title: "Queue Status", subtitle: "Track your position in real time" },
  history: { title: "History", subtitle: "Your past advising visits" },
}

export function StudentPortal() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [view, setView] = useState("dashboard")
  
  useEffect(() => {
    if (!user) {
      navigate("/")
    }
  }, [user, navigate])

  if (!user) return null

  const { title, subtitle } = meta[view]

  return (
    <AppShell nav={nav} active={view} onNavigate={setView} title={title} subtitle={subtitle}>
      {view === "dashboard" && <StudentDashboard onNavigate={setView} />}
      {view === "join" && <JoinQueue onNavigate={setView} />}
      {view === "status" && <QueueStatus onNavigate={setView} />}
      {view === "history" && <History />}
    </AppShell>
  )
}
