"use client"

import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

interface ToastContextProps {
  toast: (props: ToastProps) => void
  dismiss: (id: string) => void
  toasts: Toast[]
}

const ToastContext = React.createContext<ToastContextProps>({
  toast: () => {},
  dismiss: () => {},
  toasts: []
})

export type Toast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function ToastProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(({ title, description, variant = "default", duration = 5000 }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    
    setToasts((prev) => [...prev, { id, title, description, variant }])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = React.useContext(ToastContext)
  
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  
  return context
}