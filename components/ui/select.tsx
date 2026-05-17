import { Check, ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "~/lib/utils"

interface SelectContextType {
  value: string
  onValueChange: (val: string) => void
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  activeLabel: React.ReactNode
  setActiveLabel: React.Dispatch<React.SetStateAction<React.ReactNode>>
}

const SelectContext = React.createContext<SelectContextType | null>(null)

export function Select({
  value,
  onValueChange,
  children
}: {
  value: string
  onValueChange: (val: string) => void
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeLabel, setActiveLabel] = React.useState<React.ReactNode>("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        isOpen,
        setIsOpen,
        activeLabel,
        setActiveLabel
      }}>
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within a Select")

  return (
    <button
      type="button"
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={cn(
        "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs text-foreground transition-all duration-200 hover:border-emerald-500/30 hover:bg-accent/40 outline-none select-none text-left shadow-sm cursor-pointer",
        className
      )}
      {...props}>
      {children}
      <ChevronDown
        className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200"
        style={{ transform: context.isOpen ? "rotate(180deg)" : "none" }}
      />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within a Select")

  return (
    <span className="block truncate text-xs text-foreground">
      {context.activeLabel || placeholder}
    </span>
  )
}

export function SelectContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within a Select")

  if (!context.isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-[9999] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 text-card-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 outline-none",
        className
      )}
      {...props}>
      {children}
    </div>
  )
}

export function SelectItem({
  value,
  children,
  className,
  ...props
}: {
  value: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be used within a Select")

  const isSelected = context.value === value

  React.useEffect(() => {
    if (isSelected) {
      context.setActiveLabel(children)
    }
  }, [isSelected, children, context.setActiveLabel])

  return (
    <button
      type="button"
      onClick={() => {
        context.onValueChange(value)
        context.setIsOpen(false)
      }}
      className={cn(
        "relative flex w-full cursor-pointer items-center rounded-md py-1.5 pr-8 pl-2.5 text-xs outline-none select-none transition-all duration-150 text-foreground hover:bg-accent hover:text-accent-foreground text-left border-none bg-transparent",
        isSelected &&
          "font-medium bg-accent/40 text-emerald-500 hover:text-emerald-500",
        className
      )}
      {...props}>
      {children}
      {isSelected && (
        <span className="absolute right-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        </span>
      )}
    </button>
  )
}

export function SelectGroup({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-1", className)} {...props}>
      {children}
    </div>
  )
}

export function SelectLabel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-2 py-1 text-[10px] text-muted-foreground", className)}
      {...props}>
      {children}
    </div>
  )
}

export function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("h-px bg-border my-1 -mx-1", className)} {...props} />
  )
}
