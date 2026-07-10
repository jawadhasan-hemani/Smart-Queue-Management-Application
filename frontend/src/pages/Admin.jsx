import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {ArrowDown, ArrowUp, CheckCircle2, Clock, LayoutDashboard, Pencil, PhoneCall, Plus, Search, Settings2, TriangleAlert, Users, X} 
from "lucide-react"
import { AppShell } from "../components/shell/AppShell"
import { useApp } from "../components/AppContext"
import { formatWait, relativeTime, PriorityBadge } from "../components/shared"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"

const nav = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "services", label: "Services", icon: Settings2 },
  { key: "queues", label: "Queues", icon: Users },
]

const meta = {
  dashboard: { title: "Admin Dashboard", subtitle: "Services, queue lengths, and quick actions" },
  services: { title: "Service Management", subtitle: "Create and edit the services students can queue for" },
  queues: { title: "Queue Management", subtitle: "Reorder, remove, or serve the next student" },
}

function ServiceStateBadge({ open }) {
  return <Badge tone={open ? "success" : "neutral"}>{open ? "Open" : "Closed"}</Badge>
}

function AdminDashboard({ onEditService, onManageQueue }) {
  const { services, orderedQueue, estimatedWait, toggleServiceOpen } = useApp()

  const totalWaiting = services.reduce((sum, s) => sum + orderedQueue(s.id).length, 0)
  const openServices = services.filter((s) => s.open)
  const highPriorityOpen = openServices.filter((s) => s.priority === "high").length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Users, label: "Students waiting", value: String(totalWaiting) },
          { icon: CheckCircle2, label: "Open services", value: String(openServices.length) },
          { icon: Clock, label: "Total services", value: String(services.length) },
          { icon: TriangleAlert, label: "High priority open", value: String(highPriorityOpen) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="space-y-2 p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-[18px]" />
              </span>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Services</h2>
          <button
            type="button"
            onClick={() => onEditService(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" /> New service
          </button>
        </div>

        <div className="space-y-3">
          {services.map((s) => {
            const count = orderedQueue(s.id).length
            const wait = estimatedWait(s.id, count + 1)
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{s.name}</p>
                      <PriorityBadge priority={s.priority} />
                      <ServiceStateBadge open={s.open} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{s.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.open ? `${count} waiting · ~${formatWait(wait)} for a new arrival` : "Not accepting new students"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 rounded-md" onClick={() => onManageQueue(s.id)}>
                      Manage queue
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 rounded-md" onClick={() => onEditService(s.id)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      variant={s.open ? "destructive" : "default"}
                      size="sm"
                      className="h-9 rounded-md"
                      onClick={() => toggleServiceOpen(s.id)}
                    >
                      {s.open ? "Close" : "Open"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const PRIORITIES = ["low", "medium", "high"]
const NAME_LIMIT = 100

function blankForm() {
  return { name: "", description: "", duration: "15", priority: "medium" }
}

function ServiceForm({ editing, onSaved, onCancelEdit }) {
  const { saveService, pushNotification } = useApp()
  const [form, setForm] = useState(editing ? { ...editing, duration: String(editing.duration) } : blankForm())
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(editing ? { ...editing, duration: String(editing.duration) } : blankForm())
    setErrors({})
  }, [editing])

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) {
      e.name = "Service name is required."
    } else if (form.name.trim().length > NAME_LIMIT) {
      e.name = `Keep it under ${NAME_LIMIT} characters.`
    }
    if (!form.description.trim()) {
      e.description = "Description is required."
    }
    const duration = Number(form.duration)
    if (!form.duration || Number.isNaN(duration) || duration <= 0) {
      e.duration = "Enter the expected duration in minutes."
    }
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    saveService({
      id: editing?.id,
      name: form.name.trim(),
      description: form.description.trim(),
      duration: Number(form.duration),
      priority: form.priority,
      open: editing ? editing.open : true,
    })

    pushNotification({
      title: editing ? "Service updated" : "Service created",
      body: editing
        ? `${form.name.trim()} has been updated.`
        : `${form.name.trim()} is now available for students to join.`,
      tone: "success",
    })

    onSaved()
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editing ? "Edit service" : "New service"}</h2>
          {editing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground" htmlFor="svc-name">
              Service name
            </label>
            <input
              id="svc-name"
              type="text"
              value={form.name}
              maxLength={NAME_LIMIT}
              onChange={set("name")}
              placeholder="e.g. Financial Aid Advising"
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.name && <p className="text-[11px] font-medium text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground" htmlFor="svc-description">
              Description
            </label>
            <textarea
              id="svc-description"
              rows={2}
              value={form.description}
              onChange={set("description")}
              placeholder="What should students expect from this visit?"
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.description && <p className="text-[11px] font-medium text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="svc-duration">
                Expected duration (min)
              </label>
              <input
                id="svc-duration"
                type="number"
                min={1}
                max={240}
                value={form.duration}
                onChange={set("duration")}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.duration && <p className="text-[11px] font-medium text-destructive">{errors.duration}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="svc-priority">
                Priority level
              </label>
              <select
                id="svc-priority"
                value={form.priority}
                onChange={set("priority")}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm capitalize transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" className="h-10 w-full">
            {editing ? "Save changes" : "Create service"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ServiceManagement({ editingId, onEdit, onSaved }) {
  const { services } = useApp()
  const editing = services.find((s) => s.id === editingId) || null

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <ServiceForm editing={editing} onSaved={onSaved} onCancelEdit={() => onEdit(null)} />
      </div>

      <div className="space-y-3 lg:col-span-3">
        <h2 className="font-semibold">Existing services</h2>
        {services.map((s) => (
          <Card
            key={s.id}
            className={`transition-colors ${editingId === s.id ? "border-primary ring-1 ring-primary/30" : ""}`}
          >
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{s.name}</p>
                  <PriorityBadge priority={s.priority} />
                  <ServiceStateBadge open={s.open} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">~{s.duration} min per visit</p>
              </div>
              <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-md" onClick={() => onEdit(s.id)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function QueueManagement({ focusServiceId }) {
  const { services, orderedQueue, estimatedWait, serveNext, removeEntry, moveEntry } = useApp()
  const [selected, setSelected] = useState(focusServiceId || services[0]?.id || null)

  useEffect(() => {
    if (focusServiceId) setSelected(focusServiceId)
  }, [focusServiceId])

  const service = services.find((s) => s.id === selected) || null
  const line = useMemo(() => (service ? orderedQueue(service.id) : []), [service, orderedQueue])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap gap-2">
        {services.map((s) => {
          const count = orderedQueue(s.id).length
          const isSelected = s.id === selected
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {s.name}
              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {!service ? (
        <p className="text-sm text-muted-foreground">Create a service to start managing its queue.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{service.name}</h2>
                  <ServiceStateBadge open={service.open} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {line.length} student{line.length === 1 ? "" : "s"} in line
                </p>
              </div>
              <Button className="h-9 shrink-0" disabled={line.length === 0} onClick={() => serveNext(service.id)}>
                <PhoneCall className="size-4" /> Serve next
              </Button>
            </div>

            {line.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Search className="size-6" />
                </span>
                <div>
                  <p className="font-medium">No one is waiting</p>
                  <p className="text-sm text-muted-foreground">Students who join this service will show up here.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {line.map((entry, idx) => (
                  <li key={entry.id} className="flex items-center gap-4 p-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{entry.studentName}</p>
                        <PriorityBadge priority={entry.priority} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Joined {relativeTime(entry.joinedAt)} · ~{formatWait(estimatedWait(service.id, idx + 1))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveEntry(entry.id, "up")}
                        aria-label={`Move ${entry.studentName} up`}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === line.length - 1}
                        onClick={() => moveEntry(entry.id, "down")}
                        aria-label={`Move ${entry.studentName} down`}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        aria-label={`Remove ${entry.studentName}`}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Admin() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [view, setView] = useState("dashboard")
  const [editingId, setEditingId] = useState(null)
  const [focusServiceId, setFocusServiceId] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate("/")
    } else if (user.role !== "admin") {
      navigate("/dashboard")
    }
  }, [user, navigate])

  if (!user || user.role !== "admin") return null

  const { title, subtitle } = meta[view]

  function handleNavigate(key) {
    setView(key)
    if (key !== "services") setEditingId(null)
  }

  function goEditService(id) {
    setEditingId(id)
    setView("services")
  }

  function goManageQueue(id) {
    setFocusServiceId(id)
    setView("queues")
  }

  return (
    <AppShell nav={nav} active={view} onNavigate={handleNavigate} title={title} subtitle={subtitle}>
      {view === "dashboard" && <AdminDashboard onEditService={goEditService} onManageQueue={goManageQueue} />}
      {view === "services" && (
        <ServiceManagement editingId={editingId} onEdit={setEditingId} onSaved={() => setEditingId(null)} />
      )}
      {view === "queues" && <QueueManagement focusServiceId={focusServiceId} />}
    </AppShell>
  )
}

export default Admin