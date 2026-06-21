import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoComplete, ...props }, ref) => (
    <input
      type={type}
      autoComplete={autoComplete ?? "off"}
      className={cn(
        "flex h-10 w-full rounded-md border border-[#bfc5c8] bg-white px-3 py-2 text-base text-[#202223] shadow-sm ring-offset-white placeholder:text-[#6d7175] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008060] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f1f2f3] disabled:text-[#6d7175] disabled:opacity-70 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
