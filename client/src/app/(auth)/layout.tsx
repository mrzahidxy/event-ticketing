import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-[hsl(var(--card-contrast-foreground))] shadow-lg shadow-slate-950/50 backdrop-blur">
        {children}
      </div>
    </div>
  )
}
