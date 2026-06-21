import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoComplete, ...props }, ref) => (
    <textarea
      autoComplete={autoComplete ?? "off"}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-[#bfc5c8] bg-white px-3 py-2 text-sm text-[#202223] shadow-sm ring-offset-white placeholder:text-[#6d7175] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f1f2f3] disabled:text-[#6d7175] disabled:opacity-70",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
