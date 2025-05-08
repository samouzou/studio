"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { EarningsDataPoint } from "@/types"
import type { ChartConfig } from "@/components/ui/chart"

interface EarningsChartProps {
  data: EarningsDataPoint[];
}

const chartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function EarningsChart({ data }: EarningsChartProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Monthly Earnings</CardTitle>
        <CardDescription>
          Track your income month over month. Current year: {data.length > 0 ? data[0].year : new Date().getFullYear()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value) => `$${value / 1000}k`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
               <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="earnings" fill="var(--color-earnings)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
