import React from 'react'
import { Badge } from "./ui/badge"

export function formatWait(minutes) {
  if (minutes <= 0) return "You're next"
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `~${h}h ${m}m` : `~${h}h`
}

export function relativeTime(epoch) {
  const diff = Math.round((Date.now() - epoch) / 60000)
  if (diff < 1) return "just now"
  if (diff < 60) return `${diff} min ago`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function PriorityBadge({ priority }) {
  const map = {
    high: { tone: "danger", label: "High priority" },
    medium: { tone: "primary", label: "Medium" },
    low: { tone: "neutral", label: "Low" },
  }
  const { tone, label } = map[priority]
  return <Badge tone={tone}>{label}</Badge>
}

export function StatusBadge({ status }) {
  const map = {
    waiting: { tone: "primary", label: "Waiting" },
    almost: { tone: "warning", label: "Almost ready" },
    served: { tone: "success", label: "Served" },
  }
  const { tone, label } = map[status]
  return <Badge tone={tone}>{label}</Badge>
}
