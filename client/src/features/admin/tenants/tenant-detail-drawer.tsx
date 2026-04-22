"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/admin/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/features/admin/components/ui/separator'
import { Activity, Calendar, CalendarRange, HardDrive, Shield, User } from 'lucide-react'

export type Tenant = {
  id: string
  name: string
  slug: string
  ownerEmail: string
  landingPageHref?: string
  createdDate: string
  lastActive: string
  status: 'Active' | 'Suspended'
}

type TenantDetailDrawerProps = {
  tenant: Tenant | null
  open: boolean
  onClose: () => void
  onAction: (action: 'suspend' | 'reactivate') => void
}

export function TenantDetailDrawer({ tenant, open, onClose, onAction }: TenantDetailDrawerProps) {
  if (!tenant) return null

  const usageData = {
    eventsCount: 28,
    storageUsed: '4.2 GB',
    apiCalls: '12.4K',
  }

  const recentActivity = [
    {
      time: '2 hours ago',
      action: "Updated event 'Summer Product Summit'",
    },
    {
      time: '1 day ago',
      action: 'Added new staff member',
    },
    {
      time: '3 days ago',
      action: "Published event 'Founder Demo Night'",
    },
    {
      time: '1 week ago',
      action: 'Changed booking cutoff policy',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SheetTitle>{tenant.name}</SheetTitle>
              <Badge
                variant={tenant.status === 'Active' ? 'default' : 'destructive'}
                className={tenant.status === 'Active' ? 'bg-[#1B9C85] hover:bg-[#1B9C85]/90' : ''}
              >
                {tenant.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="mb-3">General Information</h3>
            <div className="space-y-3">
              <DetailRow icon={User} label="Owner" value={tenant.ownerEmail} />
              <DetailRow icon={Calendar} label="Created Date" value={tenant.createdDate} />
              <DetailRow icon={Shield} label="Status" value={tenant.status} />
              <DetailRow icon={Activity} label="Last Active" value={tenant.lastActive} />
            </div>
          </div>

        <Separator />

        <div>
            <h3 className="mb-3">Usage Statistics</h3>
            <div className="space-y-3">
              <StatRow icon={CalendarRange} label="Events" value={String(usageData.eventsCount)} />
              <StatRow icon={HardDrive} label="Storage Used" value={usageData.storageUsed} />
              <StatRow icon={Activity} label="API Calls (30d)" value={usageData.apiCalls} />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start justify-between gap-4">
                  <p className="text-sm">{activity.action}</p>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {tenant.status === 'Active' ? (
              <Button variant="destructive" className="w-full" onClick={() => onAction('suspend')}>
                Suspend Organizer
              </Button>
            ) : (
              <Button className="w-full" onClick={() => onAction('reactivate')}>
                Reactivate Organizer
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type DetailRowProps = {
  icon: typeof User
  label: string
  value: string
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}

type StatRowProps = {
  icon: typeof CalendarRange
  label: string
  value: string
}

function StatRow({ icon: Icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm">{value}</span>
    </div>
  )
}
