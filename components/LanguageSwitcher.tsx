import { useEffect, useRef, useState } from "react"

import { Button } from "~/components/ui/button"
import { getActiveLocale, setActiveLocale, SUPPORTED_LOCALES } from "~lib/i18n"
import { cn } from "~lib/utils"

interface LanguageSwitcherProps {
  align?: "left" | "right"
}

export function LanguageSwitcher({ align = "right" }: LanguageSwitcherProps) {
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
        className="flex flex-col items-center justify-center h-full px-1 text-muted-foreground hover:text-foreground transition-all select-none outline-none border-none bg-transparent pt-1 relative hover:bg-transparent rounded-none"
        title="Change Language">
        <div className="flex items-center justify-center w-[18px] h-[18px] transition-transform active:scale-95">
          <span className="text-[12px] leading-none select-none filter drop-shadow-sm mt-0.5">
            {activeLocale.flag}
          </span>
        </div>
        <span className="text-[9px] mt-[3px] font-medium leading-none tracking-tight">
          {activeLocale.label}
        </span>
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] mt-1.5 w-36 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 select-none",
            align === "right" ? "right-0" : "left-0"
          )}>
          <div className="flex flex-col gap-0.5">
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
                  <span className="text-sm filter drop-shadow-sm leading-none shrink-0">
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
