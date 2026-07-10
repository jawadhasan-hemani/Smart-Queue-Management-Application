import React, { useState } from "react"
import { Check, Clock, LogOut, Users } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { formatWait, PriorityBadge } from "../../components/shared"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  )
}

export function JoinQueue({ onNavigate }) {
  const { services, orderedQueue, estimatedWait, joinQueue, leaveQueue, myEntry } = useApp()
  const active = myEntry()
  const [selected, setSelected] = useState(active?.service.id ?? null)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Select a service to see the current line and estimated wait before joining.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((s) => {
          const count = orderedQueue(s.id).length
          const isMine = active?.service.id === s.id
          const isSelected = selected === s.id
          const wait = isMine ? active.wait : estimatedWait(s.id, count + 1)
          return (
            <Card
              key={s.id}
              className={`transition-colors hover:border-primary/50 cursor-pointer ${isSelected ? "border-primary ring-1 ring-primary/30" : ""} ${
                !s.open ? "opacity-70" : ""
              }`}
              onClick={() => setSelected(s.id)}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      {isMine && <Badge>Joined</Badge>}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  </div>
                  <PriorityBadge priority={s.priority} />
                </div>

                <div className="flex items-center gap-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-4" /> {count} in line
                  </span>
                  <span className="h-4 w-px bg-border" />
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-4" /> {s.open ? `~${s.duration} min avg session` : "Closed"}
                  </span>
                </div>

                {isMine ? (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={(e) => { e.stopPropagation(); onNavigate("status"); }}>
                      View status
                    </Button>
                    <Button variant="destructive" onClick={(e) => { e.stopPropagation(); leaveQueue(); }}>
                      <LogOut className="size-4" /> Leave
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!s.open}
                    variant={isSelected ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(s.id)
                      joinQueue(s.id)
                      onNavigate("status")
                    }}
                  >
                    {s.open ? (
                      <>
                        <Check className="size-4" /> Join this queue
                      </>
                    ) : (
                      "Currently closed"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
