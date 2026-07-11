import React, { useEffect, useRef, useState } from "react"
import { BellRing, Clock, MapPin, Search, LogOut } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { StatusBadge } from "../../components/shared"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"

const SIM_TICK_MS = 7000

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return "Any moment now"
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function QueueStatus({ onNavigate }) {
  const { myEntry, orderedQueue, leaveQueue, removeEntry, pushNotification } = useApp()
  const active = myEntry()

  // Keep the latest values in a ref so the interval callback below never closes over stale state
  const latestRef = useRef({})
  latestRef.current = { active, orderedQueue, removeEntry }

  const initialAheadRef = useRef(null)
  const almostNotifiedRef = useRef(false)
  const prevPositionRef = useRef(null)

  const entryId = active?.entry.id ?? null
  const isWaiting = active ? active.position > 1 : false
  const activePosition = active?.position ?? null
  const serviceName = active?.service.name ?? null
  const activeWait = active?.wait ?? null

  // Live countdown in seconds, so the wait estimate visibly ticks down instead of sitting static
  const [secondsLeft, setSecondsLeft] = useState(activeWait !== null ? activeWait * 60 : 0)

  // Reset simulation bookkeeping whenever the tracked queue entry changes (join / leave / re-join)
  useEffect(() => {
    initialAheadRef.current = active ? active.position - 1 : null
    almostNotifiedRef.current = false
    prevPositionRef.current = active ? active.position : null
    // Only re-run when a different queue entry is being tracked, not on every position tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId])

  // Simulate the line moving: every few seconds "serve" whoever is at the front of the line
  useEffect(() => {
    if (!isWaiting) return undefined
    const timer = setInterval(() => {
      const { active: current, orderedQueue: getOrdered, removeEntry: remove } = latestRef.current
      if (!current || current.position <= 1) return
      const ahead = getOrdered(current.service.id)[0]
      if (ahead && ahead.id !== current.entry.id) {
        remove(ahead.id)
      }
    }, SIM_TICK_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, isWaiting])

  // Fire a single "you're up next" notification the moment the user reaches the front
  useEffect(() => {
    if (activePosition === 1 && !almostNotifiedRef.current) {
      almostNotifiedRef.current = true
      pushNotification({
        title: "You're up next!",
        body: `Head to the ${serviceName} desk — you'll be called shortly.`,
        tone: "warning",
      })
    }
  }, [activePosition, serviceName, pushNotification])

  // Let the student know when they've moved up (but skip #1, the "up next" effect already covers that)
  useEffect(() => {
    if (
      prevPositionRef.current !== null &&
      activePosition !== null &&
      activePosition < prevPositionRef.current &&
      activePosition > 1
    ) {
      pushNotification({
        title: "You moved up!",
        body: `You're now #${activePosition} in line for ${serviceName}.`,
        tone: "info",
      })
    }
    prevPositionRef.current = activePosition
  }, [activePosition, serviceName, pushNotification])

  // Reset the live countdown whenever the estimated wait changes (position shift, join, leave)
  useEffect(() => {
    setSecondsLeft(activeWait !== null ? activeWait * 60 : 0)
  }, [activeWait])

  // Tick the countdown down every second while waiting
  useEffect(() => {
    if (!isWaiting) return undefined
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isWaiting, entryId])

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

  const { entry, service, position, status } = active
  const isFirst = position === 1

  const initialAhead = initialAheadRef.current ?? Math.max(position - 1, 0)
  const aheadNow = Math.max(position - 1, 0)
  const progress =
    initialAhead > 0 ? Math.min(100, Math.round(((initialAhead - aheadNow) / initialAhead) * 100)) : 100

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

            {!isFirst && (
              <div className="mx-auto mt-5 max-w-xs">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Line progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
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
                  <p className="text-sm text-muted-foreground">
                    {isFirst ? "You're next" : formatCountdown(secondsLeft)}
                  </p>
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
