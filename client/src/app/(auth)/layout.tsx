import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[url('/images/event-shell.svg')] bg-cover bg-center opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative grid min-h-screen place-items-center px-6 py-16">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 p-8 text-[hsl(var(--card-contrast-foreground))] shadow-lg shadow-slate-950/50">
          {children}
        </Card>
      </div>
    </div>
  )
}
