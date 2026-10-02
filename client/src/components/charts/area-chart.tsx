'use client'

import type { ComponentPropsWithoutRef } from 'react'
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'

type AreaChartProps = ComponentPropsWithoutRef<typeof RechartsAreaChart>

const countFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})
const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function AreaChart(props: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsAreaChart {...props}>
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#475569', fontSize: 12 }}
        />
        <YAxis
          yAxisId="bookings"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(value: number) => countFormatter.format(value)}
          width={48}
        />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
          width={64}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => [
            name === 'Revenue'
              ? formatCurrency(Number(value ?? 0))
              : `${Number(value ?? 0).toLocaleString()} bookings`,
            name,
          ]}
          contentStyle={{
            borderRadius: '1rem',
            border: '1px solid #cbd5f5',
            backgroundColor: '#ffffff',
          }}
        />
        <Legend verticalAlign="top" height={32} />
        <Area
          type="monotone"
          dataKey="primary"
          name="Bookings"
          yAxisId="bookings"
          stroke="#0f766e"
          fill="url(#primaryGradient)"
          strokeWidth={2}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          name="Revenue"
          yAxisId="revenue"
          stroke="#38bdf8"
          fill="#38bdf8"
          fillOpacity={0.1}
          strokeWidth={2}
          activeDot={{ r: 5 }}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
