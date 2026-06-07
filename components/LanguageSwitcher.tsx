import { useEffect, useRef, useState } from "react"

import { Button } from "~components/ui/button"
import { getActiveLocale, setActiveLocale, SUPPORTED_LOCALES } from "~lib/i18n"
import { cn } from "~lib/utils"

interface LanguageSwitcherProps {
  align?: "left" | "right"
  showLabel?: boolean
}

export function LanguageSwitcher({
  align = "right",
  showLabel = false
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeCode = getActiveLocale()
  const activeLocale =
    SUPPORTED_LOCALES.find((l) => l.code === activeCode) || SUPPORTED_LOCALES[0]
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (code: string) => {
    if (code !== activeCode) {
      setActiveLocale(code)
      setIsOpen(false)
      // Fast refresh to reload all static text nodes in the DOM
      window.location.reload()
    }
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center text-muted-foreground hover:text-foreground transition-all select-none outline-none border-none bg-transparent hover:bg-muted/60 rounded-full shadow-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-transparent",
          showLabel
            ? "flex flex-col h-full px-1 pt-1 rounded-none"
            : "h-9 w-9 p-0"
        )}
        title="Change Language">
        <div
          className={cn(
            "flex items-center justify-center transition-transform active:scale-95",
            showLabel
              ? "w-[18px] h-[18px]"
              : "w-[24px] h-[24px] rounded-full overflow-hidden"
          )}>
          <span
            className={cn(
              "leading-none select-none",
              showLabel ? "text-[12px] mt-0.5" : "text-base mt-0"
            )}>
            {activeLocale.flag}
          </span>
        </div>
        {showLabel && (
          <span className="text-[9px] mt-[3px] font-medium leading-none tracking-tight">
            {activeLocale.label}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] mt-1.5 w-36 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 select-none",
            align === "right" ? "right-0" : "left-0"
          )}>
          <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
            {SUPPORTED_LOCALES.map((loc) => {
              const isActive = loc.code === activeCode
              return (
                <Button
                  key={loc.code}
                  type="button"
                  variant="ghost"
                  onClick={() => handleSelect(loc.code)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors duration-150 cursor-pointer justify-start h-auto",
                    isActive
                      ? "bg-[#0a66c2]/10 dark:bg-[#70b5f9]/15 text-[#0a66c2] dark:text-[#70b5f9] hover:bg-[#0a66c2]/10 dark:hover:bg-[#70b5f9]/15 hover:text-[#0a66c2] dark:hover:text-[#70b5f9]"
                      : "hover:bg-muted/60 dark:hover:bg-[#222a30] text-foreground/80 hover:text-foreground"
                  )}>
                  <span className="text-sm leading-none shrink-0">
                    {loc.flag}
                  </span>
                  <span className="truncate flex-1">{loc.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
