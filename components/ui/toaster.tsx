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
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-[.success]:bg-emerald-100 group-[.success]:text-emerald-700 group-[.warning]:bg-amber-100 group-[.warning]:text-amber-700 group-[.destructive]:bg-red-100 group-[.destructive]:text-red-700">
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
