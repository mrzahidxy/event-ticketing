import { Skeleton } from '@/components/ui/skeleton'

export default function OrganizerLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-44 rounded-full" />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-14 w-3/4 rounded-2xl" />
              <Skeleton className="h-6 w-full rounded-full" />
              <Skeleton className="h-6 w-2/3 rounded-full" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-32 rounded-xl" />
                <Skeleton className="h-11 w-36 rounded-xl" />
              </div>
            </div>
            <div className="grid gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded-full" />
                <Skeleton className="h-8 w-72 rounded-full" />
              </div>
              <Skeleton className="h-4 w-44 rounded-full" />
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-72 rounded-3xl" />
              <Skeleton className="h-72 rounded-3xl" />
              <Skeleton className="h-72 rounded-3xl" />
            </div>
          </section>

          <aside className="space-y-6">
            <Skeleton className="h-[820px] rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </aside>
        </div>
      </div>
    </main>
  )
}
