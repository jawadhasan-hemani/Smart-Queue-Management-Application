import * as React from "react"
import { cn } from "../../lib/utils"

const tones = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-[oklch(0.62_0.13_145)]/15 text-[oklch(0.42_0.11_145)]",
  warning: "bg-[oklch(0.72_0.14_75)]/18 text-[oklch(0.46_0.12_65)]",
  danger: "bg-destructive/12 text-destructive",
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
