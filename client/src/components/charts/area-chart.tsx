'use client'

import type { ComponentPropsWithoutRef } from 'react'
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type AreaChartProps = ComponentPropsWithoutRef<typeof RechartsAreaChart>

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
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            borderRadius: '1rem',
            border: '1px solid #cbd5f5',
            backgroundColor: '#ffffff',
          }}
        />
        <Area
          type="monotone"
          dataKey="primary"
          stroke="#0f766e"
          fill="url(#primaryGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          stroke="#38bdf8"
          fill="#38bdf8"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
