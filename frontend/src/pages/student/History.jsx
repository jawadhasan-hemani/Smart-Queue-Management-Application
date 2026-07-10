import React from "react"
import { CheckCircle2, Clock, LogOut, XCircle } from "lucide-react"
import { useApp } from "../../components/AppContext"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent } from "../../components/ui/card"

const outcomeConfig = {
  Served: { tone: "success", Icon: CheckCircle2 },
  "Left queue": { tone: "neutral", Icon: LogOut },
  "No-show": { tone: "danger", Icon: XCircle },
}

export function History() {
  const { history } = useApp()
  const served = history.filter((h) => h.outcome === "Served").length
  const avgWait = Math.round(
    history.filter((h) => h.waitMinutes > 0).reduce((s, h) => s + h.waitMinutes, 0) /
      Math.max(1, history.filter((h) => h.waitMinutes > 0).length),
  )

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

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {history.map((h) => {
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
