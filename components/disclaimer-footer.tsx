import { getMessage } from "~lib/i18n"

export function DisclaimerFooter({ className }: { className?: string }) {
  return (
    <footer
      className={`text-center text-[9px] text-muted-foreground/60 leading-normal px-4 py-3 border-t border-border/30 bg-[#f9f9fb] dark:bg-[#181d22] select-none ${className || ""}`}
      style={{ fontFamily: "Source Sans 3, sans-serif" }}>
      {getMessage("disclaimerText")}
    </footer>
  )
}
