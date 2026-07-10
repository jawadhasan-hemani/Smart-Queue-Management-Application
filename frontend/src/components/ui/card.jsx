import * as React from "react"
import { cn } from "../../lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1 p-5", className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h3 data-slot="card-title" className={cn("text-base font-semibold leading-tight", className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn("flex items-center p-5 pt-0", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
