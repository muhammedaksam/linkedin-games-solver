function getMessage(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    return chrome.i18n.getMessage(key, substitutions)
  }

  const fallbacks: Record<string, string> = {
    disclaimerText:
      "Disclaimer: This is an independent, open-source educational project. It is not affiliated with, sponsored by, or endorsed by LinkedIn Corporation. 'LinkedIn' is a registered trademark of LinkedIn Corporation."
  }
  return fallbacks[key] || key
}

export function DisclaimerFooter({ className }: { className?: string }) {
  return (
    <footer
      className={`text-center text-[9px] text-muted-foreground/60 leading-normal px-4 py-3 border-t border-border/30 bg-[#f9f9fb] dark:bg-[#181d22] select-none ${className || ""}`}
      style={{ fontFamily: "Source Sans 3, sans-serif" }}>
      {getMessage("disclaimerText")}
    </footer>
  )
}
