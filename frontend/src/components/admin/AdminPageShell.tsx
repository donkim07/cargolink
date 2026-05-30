import type { ReactNode } from 'react'

interface AdminPageShellProps {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}

export function AdminPageShell({ title, description, action, children }: AdminPageShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-charcoal/60">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
