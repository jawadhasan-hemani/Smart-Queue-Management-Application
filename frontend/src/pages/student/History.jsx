import React, { useMemo, useState } from "react"
import { CheckCircle2, Clock, LogOut, Search, XCircle } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent } from "../../components/ui/card"

const outcomeConfig = {
  Served: { tone: "success", Icon: CheckCircle2 },
  "Left queue": { tone: "neutral", Icon: LogOut },
  "No-show": { tone: "danger", Icon: XCircle },
}

const filters = [
  { key: "all", label: "All" },
  { key: "Served", label: "Served" },
  { key: "Left queue", label: "Left" },
  { key: "No-show", label: "No-show" },
]

const sortOptions = [
  { key: "date-desc", label: "Newest first" },
  { key: "date-asc", label: "Oldest first" },
  { key: "wait-desc", label: "Longest wait" },
]

export function History() {
  const { history } = useApp()
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")

  const served = history.filter((h) => h.outcome === "Served").length
  const avgWait = Math.round(
    history.filter((h) => h.waitMinutes > 0).reduce((s, h) => s + h.waitMinutes, 0) /
      Math.max(1, history.filter((h) => h.waitMinutes > 0).length),
  )

  const filtered = useMemo(() => {
    const matches = history.filter((h) => {
      const matchesFilter = filter === "all" || h.outcome === filter
      const matchesQuery = h.serviceName.toLowerCase().includes(query.trim().toLowerCase())
      return matchesFilter && matchesQuery
    })
    return [...matches].sort((a, b) => {
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date)
      if (sortBy === "wait-desc") return b.waitMinutes - a.waitMinutes
      return new Date(b.date) - new Date(a.date)
    })
  }, [history, filter, query, sortBy])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total visits", value: String(history.length) },
          { label: "Completed", value: String(served) },
          { label: "Avg. wait", value: `${avgWait} min` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          >
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by service"
              className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Search className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No visits match your filters</p>
              <p className="text-xs text-muted-foreground">Try a different service name or outcome.</p>
            </div>
          )}
          {filtered.map((h) => {
            const { tone, Icon } = outcomeConfig[h.outcome]
            return (
              <div key={h.id} className="flex items-center gap-4 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{h.serviceName}</p>
                  <p className="text-sm text-muted-foreground">{h.date}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone={tone}>{h.outcome}</Badge>
                  {h.waitMinutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {h.waitMinutes} min wait
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
