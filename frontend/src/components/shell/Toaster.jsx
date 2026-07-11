import React, { useEffect, useState } from "react"
import { useApp } from "../AppContext"
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react"

export function Toaster() {
  const { notifications } = useApp()
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!notifications || notifications.length === 0) return
    const latest = notifications[0]
    
    // Only show if it's recent (created in the last 2 seconds)
    if (Date.now() - latest.createdAt < 2000) {
      setToasts(prev => {
        // Prevent duplicate toasts for the same notification id
        if (prev.some(t => t.id === latest.id)) return prev
        return [latest, ...prev]
      })
      
      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== latest.id))
      }, 5000)
    }
  }, [notifications])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => {
        const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'destructive' ? TriangleAlert : Info
        const colorClass = toast.tone === 'success' ? 'text-green-500' : toast.tone === 'destructive' ? 'text-red-500' : 'text-blue-500'
        
        return (
          <div 
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xl w-80 animate-toast"
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${colorClass}`} />
            <div className="flex flex-col gap-1 flex-1">
              <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              <p className="text-sm text-muted-foreground">{toast.body}</p>
            </div>
            <button 
              type="button"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
