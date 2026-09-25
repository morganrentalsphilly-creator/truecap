'use client'

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
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
        const Icon =
          variant === 'success'
            ? CheckCircle2
            : variant === 'destructive' || variant === 'warning'
              ? AlertTriangle
              : Info

        return (
          <Toast key={id} {...props}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-[.success]:bg-positive-light group-[.success]:text-positive group-[.warning]:bg-caution-light group-[.warning]:text-caution-text group-[.destructive]:bg-negative/10 group-[.destructive]:text-destructive-text">
                <Icon className="size-4" />
              </span>
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
