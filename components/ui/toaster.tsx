'use client'

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant
        // Each variant has its own glyph, so a failure never differs from a
        // caution or an info toast by color alone (WCAG 1.4.1) now that
        // every variant sits on the same paper.
        const Icon =
          variant === 'success'
            ? CheckCircle2
            : variant === 'destructive'
              ? XCircle
              : variant === 'warning'
                ? AlertTriangle
                : Info

        return (
          <Toast key={id} {...props}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* The status icon alone, no tinted circle behind it. Only the
                  pass, caution and fail variants color it (DESIGN.md: Signal
                  Blue means "act here", so an info toast's icon is ink); the
                  text stays in ink on the raised paper. */}
              <Icon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-foreground group-[.success]:text-positive group-[.warning]:text-caution-text group-[.destructive]:text-destructive-text"
              />
              <div className="grid min-w-0 gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
