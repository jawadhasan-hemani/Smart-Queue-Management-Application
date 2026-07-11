import React, { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {ArrowDown,ArrowLeft,ArrowUp,Calendar as CalendarIcon,CheckCircle2,ChevronDown,ChevronLeft,ChevronRight,Clock,History as HistoryIcon,LayoutDashboard,LogOut,Pencil,PhoneCall,Plus,Search,Settings2,TriangleAlert,Users,X,XCircle,}
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
  { key: "history", label: "History", icon: HistoryIcon },
]

const meta = {
  dashboard: { title: "Admin Dashboard", subtitle: "Services, queue lengths, and quick actions" },
  services: { title: "Service Management", subtitle: "Create and edit the services students can queue for" },
  queues: { title: "Queue Management", subtitle: "Pick a queue to reorder, remove, or serve students" },
  history: { title: "History", subtitle: "Every visit, served or left — filter by service and date" },
}

const DAY_MS = 24 * 60 * 60 * 1000

function ServiceStateBadge({ open }) {
  return <Badge tone={open ? "success" : "neutral"}>{open ? "Open" : "Closed"}</Badge>
}

function Select({ id, value, onChange, className = "", children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const options = React.Children.toArray(children).map((child) => ({
    value: child.props.value,
    label: child.props.children,
  }))

  const selected = options.find((o) => String(o.value) === String(value))

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border border-border bg-card py-2 pl-3 pr-3 text-sm text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      >
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in zoom-in-95">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                String(value) === String(o.value)
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                onChange({ target: { value: o.value } })
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DatePicker({ id, value, onChange, placeholder = "mm/dd/yyyy" }) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const ref = useRef(null)

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00")
      if (!isNaN(d)) setCurrentMonth(d)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))

  function handleSelect(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    onChange({ target: { value: `${y}-${m}-${day}` } })
    setOpen(false)
  }

  const selectedDate = value ? new Date(value + "T12:00:00") : null
  const displayValue =
    selectedDate && !isNaN(selectedDate)
      ? selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : ""

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border border-border bg-card py-2 pl-3 pr-3 text-sm transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring ${
          displayValue ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-border bg-card p-3 shadow-xl animate-in fade-in zoom-in-95 sm:left-0 sm:right-auto">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-sm font-semibold text-foreground">
              {currentMonth.toLocaleString("default", { month: "long" })} {year}
            </div>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-[10px] font-medium uppercase text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />
              const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString()
              const isToday = d.toDateString() === new Date().toDateString()

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(d)}
                  className={`flex size-7 items-center justify-center rounded-lg text-xs transition-colors hover:bg-muted hover:text-foreground ${
                    isSelected
                      ? "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      : isToday
                        ? "bg-muted font-semibold text-foreground"
                        : "text-foreground"
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
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
              <Select id="svc-priority" value={form.priority} onChange={set("priority")} className="pl-4 capitalize">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </Select>
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

function QueueOverviewCard({ service, line, onOpen }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{service.name}</h3>
            <p className="mt-0.5 text-sm">
              <span className={service.open ? "font-medium text-[oklch(0.5_0.12_170)]" : "font-medium text-muted-foreground"}>
                {service.open ? "Open" : "Closed"}
              </span>
              <span className="text-muted-foreground"> · {line.length} student{line.length === 1 ? "" : "s"} in line</span>
            </p>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {line.length}
          </span>
        </div>

        {line.length > 0 && (
          <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
            {line.map((entry, idx) => (
              <li key={entry.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{entry.studentName}</span>{" "}
                    <PriorityBadge priority={entry.priority} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {relativeTime(entry.joinedAt)} ·{" "}
                    {formatWait((entry.__wait ?? 0))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <button
        type="button"
        onClick={onOpen}
        className="border-t border-border px-5 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Open queue
      </button>
    </Card>
  )
}

function QueueManagement({ selectedId, onSelect, onServe, onRemove }) {
  const { services, orderedQueue, estimatedWait, moveEntry } = useApp()
  const service = services.find((s) => s.id === selectedId) || null
  const line = useMemo(() => (service ? orderedQueue(service.id) : []), [service, orderedQueue])

  if (!service) {
    if (services.length === 0) {
      return <p className="mx-auto max-w-5xl text-sm text-muted-foreground">Create a service to start managing its queue.</p>
    }
    return (
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
        {services.map((s) => {
          const l = orderedQueue(s.id).map((entry, idx) => ({ ...entry, __wait: estimatedWait(s.id, idx + 1) }))
          return <QueueOverviewCard key={s.id} service={s} line={l} onOpen={() => onSelect(s.id)} />
        })}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All queues
      </button>

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
            <Button
              className="h-9 shrink-0"
              disabled={line.length === 0}
              onClick={() => onServe(service, line[0])}
            >
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
                      onClick={() => onRemove(service, entry)}
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
    </div>
  )
}

const OUTCOME_CONFIG = {
  served: { label: "Served", tone: "success", Icon: CheckCircle2 },
  left: { label: "Left queue", tone: "neutral", Icon: LogOut },
  removed: { label: "Removed by admin", tone: "danger", Icon: XCircle },
}

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "all", label: "All time" },
]

function toDateInputValue(ts) {
  const d = new Date(ts)
  return d.toISOString().slice(0, 10)
}

function AdminHistory({ log }) {
  const { services } = useApp()
  const [serviceFilter, setServiceFilter] = useState("all")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [preset, setPreset] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  function applyPreset(key) {
    setPreset(key)
    if (key === "today") {
      const today = toDateInputValue(Date.now())
      setDateFrom(today)
      setDateTo(today)
    } else if (key === "week") {
      setDateFrom(toDateInputValue(Date.now() - 6 * DAY_MS))
      setDateTo(toDateInputValue(Date.now()))
    } else {
      setDateFrom("")
      setDateTo("")
    }
  }

  const filtered = useMemo(() => {
    return log.filter((entry) => {
      if (serviceFilter !== "all" && entry.serviceId !== serviceFilter) return false
      if (outcomeFilter !== "all" && entry.outcome !== outcomeFilter) return false
      if (dateFrom && entry.resolvedAt < new Date(dateFrom).setHours(0, 0, 0, 0)) return false
      if (dateTo && entry.resolvedAt > new Date(dateTo).setHours(23, 59, 59, 999)) return false
      return true
    })
  }, [log, serviceFilter, outcomeFilter, dateFrom, dateTo])

  const served = filtered.filter((e) => e.outcome === "served")
  const avgWait = served.length
    ? Math.round(served.reduce((sum, e) => sum + e.waitMinutes, 0) / served.length)
    : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Matching visits", value: String(filtered.length) },
          { label: "Served", value: String(served.length) },
          { label: "Left / removed", value: String(filtered.length - served.length) },
          { label: "Avg. wait (served)", value: `${avgWait} min` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  preset === p.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="hist-service">
                Service
              </label>
              <Select id="hist-service" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="all">All services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="hist-outcome">
                Outcome
              </label>
              <Select id="hist-outcome" value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}>
                <option value="all">All outcomes</option>
                <option value="served">Served</option>
                <option value="left">Left queue</option>
                <option value="removed">Removed by admin</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="hist-from">
                From
              </label>
              <DatePicker
                id="hist-from"
                value={dateFrom}
                onChange={(e) => {
                  setPreset("custom")
                  setDateFrom(e.target.value)
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground" htmlFor="hist-to">
                To
              </label>
              <DatePicker
                id="hist-to"
                value={dateTo}
                onChange={(e) => {
                  setPreset("custom")
                  setDateTo(e.target.value)
                }}
              />
            </div>
          </div>

          {(serviceFilter !== "all" || outcomeFilter !== "all" || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setServiceFilter("all")
                setOutcomeFilter("all")
                applyPreset("all")
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Reset filters
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="size-6" />
              </span>
              <div>
                <p className="font-medium">No visits match these filters</p>
                <p className="text-sm text-muted-foreground">Try widening the date range or clearing a filter.</p>
              </div>
            </div>
          )}
          {filtered.map((entry) => {
            const { label, tone, Icon } = OUTCOME_CONFIG[entry.outcome]
            return (
              <div key={entry.id} className="flex items-center gap-4 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{entry.studentName}</p>
                    <PriorityBadge priority={entry.priority} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{entry.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.resolvedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone={tone}>{label}</Badge>
                  {entry.outcome === "served" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {entry.waitMinutes} min wait
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function buildSeedLog() {
  const now = Date.now()
  const raw = [
    { studentName: "Priya Nair", serviceId: "svc-registration", priority: "medium", outcome: "served", daysAgo: 0, hoursAgo: 3, waitMinutes: 9 },
    { studentName: "Jordan Blake", serviceId: "svc-general", priority: "low", outcome: "left", daysAgo: 0, hoursAgo: 5, waitMinutes: 14 },
    { studentName: "Emma Torres", serviceId: "svc-career", priority: "medium", outcome: "served", daysAgo: 1, hoursAgo: 2, waitMinutes: 22 },
    { studentName: "Noah Kim", serviceId: "svc-registration", priority: "high", outcome: "served", daysAgo: 1, hoursAgo: 6, waitMinutes: 6 },
    { studentName: "Ava Nguyen", serviceId: "svc-financial", priority: "high", outcome: "removed", daysAgo: 2, hoursAgo: 1, waitMinutes: 31 },
    { studentName: "Ethan Brooks", serviceId: "svc-career", priority: "low", outcome: "served", daysAgo: 3, hoursAgo: 4, waitMinutes: 18 },
    { studentName: "Sofia Rossi", serviceId: "svc-general", priority: "medium", outcome: "served", daysAgo: 4, hoursAgo: 2, waitMinutes: 12 },
    { studentName: "Marcus Lee", serviceId: "svc-registration", priority: "low", outcome: "left", daysAgo: 6, hoursAgo: 3, waitMinutes: 20 },
    { studentName: "Grace Park", serviceId: "svc-general", priority: "high", outcome: "served", daysAgo: 9, hoursAgo: 1, waitMinutes: 8 },
  ]
  return raw.map((r, i) => {
    const resolvedAt = now - r.daysAgo * DAY_MS - r.hoursAgo * 3600_000
    return {
      id: `seed-${i}`,
      studentName: r.studentName,
      serviceId: r.serviceId,
      serviceName: undefined, 
      priority: r.priority,
      outcome: r.outcome,
      joinedAt: resolvedAt - r.waitMinutes * 60_000,
      resolvedAt,
      waitMinutes: r.waitMinutes,
    }
  })
}

function Admin() {
  const navigate = useNavigate()
  const { user, services, queues, serveNext, removeEntry } = useApp()
  const [view, setView] = useState("dashboard")
  const [editingId, setEditingId] = useState(null)
  const [selectedQueueId, setSelectedQueueId] = useState(null)
  const [log, setLog] = useState(() => buildSeedLog())

  const justResolvedRef = useRef(new Set())
  const prevQueuesRef = useRef(queues)

  useEffect(() => {
    const currentIds = new Set(queues.map((q) => q.id))
    const vanished = prevQueuesRef.current.filter((q) => !currentIds.has(q.id))
    if (vanished.length > 0) {
      setLog((prev) => {
        const additions = []
        vanished.forEach((entry) => {
          if (justResolvedRef.current.has(entry.id)) {
            justResolvedRef.current.delete(entry.id)
            return
          }
          const svc = services.find((s) => s.id === entry.serviceId)
          additions.push({
            id: `log-${entry.id}`,
            studentName: entry.studentName,
            serviceId: entry.serviceId,
            serviceName: svc?.name || "Unknown service",
            priority: entry.priority,
            outcome: "left",
            joinedAt: entry.joinedAt,
            resolvedAt: Date.now(),
            waitMinutes: Math.max(0, Math.round((Date.now() - entry.joinedAt) / 60000)),
          })
        })
        return additions.length ? [...additions, ...prev] : prev
      })
    }
    prevQueuesRef.current = queues
  }, [queues, services])

  useEffect(() => {
    if (!user) {
      navigate("/")
    } else if (user.role !== "admin") {
      navigate("/dashboard")
    }
  }, [user, navigate])

  const resolvedLog = useMemo(
    () => log.map((e) => ({ ...e, serviceName: e.serviceName || services.find((s) => s.id === e.serviceId)?.name || "Unknown service" })),
    [log, services],
  )

  if (!user || user.role !== "admin") return null

  function recordResolution(service, entry, outcome) {
    if (!entry) return
    justResolvedRef.current.add(entry.id)
    setLog((prev) => [
      {id: `log-${entry.id}-${Date.now()}`, studentName: entry.studentName, serviceId: service.id, serviceName: service.name, priority: entry.priority, outcome, joinedAt: entry.joinedAt, resolvedAt: Date.now(), waitMinutes: Math.max(0, Math.round((Date.now() - entry.joinedAt) / 60000)),},
      ...prev,
    ])
  }

  function handleServe(service, entry) {
    recordResolution(service, entry, "served")
    serveNext(service.id)
  }

  function handleRemove(service, entry) {
    recordResolution(service, entry, "removed")
    removeEntry(entry.id)
  }

  const { title, subtitle } = view === "queues" && selectedQueueId
    ? { title: meta.queues.title, subtitle: "Reorder, remove, or serve the next student" }
    : meta[view]

  function handleNavigate(key) {
    setView(key)
    if (key !== "services") setEditingId(null)
  }

  function goEditService(id) {
    setEditingId(id)
    setView("services")
  }

  function goManageQueue(id) {
    setSelectedQueueId(id)
    setView("queues")
  }

  return (
    <AppShell nav={nav} active={view} onNavigate={handleNavigate} title={title} subtitle={subtitle}>
      {view === "dashboard" && <AdminDashboard onEditService={goEditService} onManageQueue={goManageQueue} />}
      {view === "services" && (
        <ServiceManagement editingId={editingId} onEdit={setEditingId} onSaved={() => setEditingId(null)} />
      )}
      {view === "queues" && (
        <QueueManagement
          selectedId={selectedQueueId}
          onSelect={setSelectedQueueId}
          onServe={handleServe}
          onRemove={handleRemove}
        />
      )}
      {view === "history" && <AdminHistory log={resolvedLog} />}
    </AppShell>
  )
}

export default Admin