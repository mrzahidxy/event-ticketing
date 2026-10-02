'use client'

import type { ComponentPropsWithoutRef } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'

type BarChartProps = ComponentPropsWithoutRef<typeof RechartsBarChart>

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function BarChart(props: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RechartsBarChart {...props} layout="vertical" margin={{ left: 4, right: 12 }}>
        <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
        />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#475569', fontSize: 11 }}
          width={82}
        />
        <Tooltip
          cursor={{ fill: 'rgba(15,118,110,0.1)' }}
          formatter={(value, _name, item) => {
            const count = Number(item.payload?.count ?? 0)
            return [
              `${formatCurrency(Number(value ?? 0))} · ${count.toLocaleString()} payments`,
              'Revenue',
            ]
          }}
          contentStyle={{
            borderRadius: '1rem',
            border: '1px solid #cbd5f5',
            backgroundColor: '#ffffff',
          }}
        />
        <Bar
          dataKey="value"
          radius={[0, 8, 8, 0]}
          fill="#0f766e"
          maxBarSize={28}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
