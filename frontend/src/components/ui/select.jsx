import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

export function Select({ id, value, onChange, className = "", children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const options = React.Children.toArray(children).map((child) => ({
    value: child.props.value,
    label: child.props.children,
  }))

  const selected = options.find((o) => String(o.value) === String(value))

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-xl border border-border bg-card py-2 pl-3 pr-3 text-sm text-foreground transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      >
        <span className="truncate">{selected ? selected.label : "Select..."}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in zoom-in-95">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                String(value) === String(o.value)
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                onChange({ target: { value: o.value } })
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
