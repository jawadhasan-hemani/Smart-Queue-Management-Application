import React from "react"
import { ArrowRight, BellRing, Clock, MapPin, Search, LogOut } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { formatWait, StatusBadge } from "../../components/shared"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"

export function QueueStatus({ onNavigate }) {
  const { myEntry, orderedQueue, leaveQueue } = useApp()
  const active = myEntry()

  if (!active) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Search className="size-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Not in a queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">You aren't currently waiting for any service.</p>
        </div>
        <Button onClick={() => onNavigate("join")} className="mt-2">
          Find a service
        </Button>
      </div>
    )
  }

  const { entry, service, position, wait, status } = active
  const isFirst = position === 1
  const line = orderedQueue(service.id)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Status Card */}
      <Card className={`overflow-hidden border-2 ${isFirst ? "border-primary" : "border-border"}`}>
        <CardContent className="p-0">
          <div className={`p-8 text-center ${isFirst ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
            <StatusBadge status={status} />
            <h2 className="mt-4 text-6xl font-bold tracking-tighter">#{position}</h2>
            <p className={`mt-2 font-medium ${isFirst ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
              {isFirst ? "You're next!" : "Current position"}
            </p>
          </div>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Service</p>
                  <p className="text-sm text-muted-foreground">{service.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Estimated wait</p>
                  <p className="text-sm text-muted-foreground">{formatWait(wait)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress timeline */}
      <div>
        <h3 className="mb-4 font-semibold">Your journey</h3>
        <Card>
          <CardContent className="p-6">
            <div className="relative border-l-2 border-muted pl-6">
              <div className="mb-8">
                <span className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-card">
                  <span className="size-1.5 rounded-full bg-primary-foreground" />
                </span>
                <p className="font-medium leading-none">Joined the queue</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You joined at {new Date(entry.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {position > 1 && (
                <div className="mb-8">
                  <span className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-card">
                    <span className="flex size-1.5 rounded-full bg-primary-foreground [animation:pulse_1.6s_ease-in-out_infinite]" />
                  </span>
                  <p className="font-medium leading-none">Waiting</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There are {position - 1} students ahead of you
                  </p>
                </div>
              )}

              {isFirst && (
                <div className="mb-8">
                  <span className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-primary ring-4 ring-card">
                    <span className="flex size-1.5 rounded-full bg-primary-foreground [animation:pulse_1.6s_ease-in-out_infinite]" />
                  </span>
                  <p className="font-medium leading-none text-primary">You're next</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please head to the advising area and listen for your name.
                  </p>
                </div>
              )}

              <div className="opacity-50">
                <span className="absolute -left-[9px] flex size-4 items-center justify-center rounded-full bg-muted ring-4 ring-card" />
                <p className="font-medium leading-none">Served</p>
                <p className="mt-1 text-sm text-muted-foreground">Your advising session begins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isFirst && (
        <div className="flex items-center gap-3 rounded-xl border border-[oklch(0.55_0.13_65)]/20 bg-[oklch(0.72_0.14_75)]/10 p-4 text-[oklch(0.46_0.12_65)]">
          <BellRing className="size-5 shrink-0" />
          <p className="text-sm font-medium">Keep this page open or listen for announcements. Your turn is coming up.</p>
        </div>
      )}

      <div className="pt-2 flex justify-center">
        <Button 
          variant="destructive" 
          className="w-full sm:w-auto"
          onClick={() => {
            leaveQueue();
            onNavigate("dashboard");
          }}
        >
          <LogOut className="size-4 mr-2" />
          Leave queue
        </Button>
      </div>
    </div>
  )
}
