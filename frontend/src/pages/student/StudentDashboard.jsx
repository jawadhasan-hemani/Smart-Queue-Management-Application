import React from "react"
import { ArrowRight, Bell, CalendarClock, CheckCircle2, Clock, MapPin, Users } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { formatWait, relativeTime } from "../../components/shared"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"

function StatusBadgeMaybe({ read }) {
  if (read) return null
  return <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="unread" />
}

export function StudentDashboard({ onNavigate }) {
  const { user, services, orderedQueue, myEntry, notifications, joinQueue } = useApp()
  const active = myEntry()
  const openServices = services.filter((s) => s.open)
  const totalWaiting = services.reduce((sum, s) => sum + orderedQueue(s.id).length, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Good to see you, <span className="font-medium text-foreground">{user?.name?.split(" ")[0] || 'Student'}</span>.
        </p>
      </div>

      {/* Live status hero */}
      {active ? (
        <Card className="overflow-hidden border-primary/30 bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-primary-foreground/90 [animation:pulse_1.6s_ease-in-out_infinite]" />
                <span className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
                  You're in a queue
                </span>
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80">{active.service.name}</p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-5xl font-semibold tracking-tight">#{active.position}</span>
                  <span className="text-sm text-primary-foreground/80">in line · {formatWait(active.wait)}</span>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="h-11 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => onNavigate("status")}
            >
              View live status <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarClock className="size-6" />
              </span>
              <div>
                <p className="font-medium">You're not in any queue right now</p>
                <p className="text-sm text-muted-foreground">Pick a service to join a line or book advising time.</p>
              </div>
            </div>
            <Button size="lg" className="h-11" onClick={() => onNavigate("join")}>
              Join a queue <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: MapPin, label: "Current position", value: active ? `#${active.position}` : "—" },
          { icon: Clock, label: "Estimated wait", value: active ? formatWait(active.wait) : "—" },
          { icon: Users, label: "Students waiting", value: String(totalWaiting) },
          { icon: CheckCircle2, label: "Open services", value: String(openServices.length) },
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active services */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Active services</h2>
            <button
              type="button"
              onClick={() => onNavigate("join")}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {openServices.map((s) => {
              const count = orderedQueue(s.id).length
              return (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {count} waiting · ~{s.duration} min each
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 shrink-0 rounded-md" 
                      onClick={() => {
                        joinQueue(s.id);
                        onNavigate("status");
                      }}
                    >
                      Join
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Notifications summary */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <StatusBadgeMaybe read={n.read} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{relativeTime(n.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
