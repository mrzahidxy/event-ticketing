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

type BarChartProps = ComponentPropsWithoutRef<typeof RechartsBarChart>

export function BarChart(props: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RechartsBarChart {...props}>
        <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#475569', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(15,118,110,0.1)' }}
          contentStyle={{
            borderRadius: '1rem',
            border: '1px solid #cbd5f5',
            backgroundColor: '#ffffff',
          }}
        />
        <Bar
          dataKey="value"
          radius={[12, 12, 12, 12]}
          fill="#0f766e"
          maxBarSize={36}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
