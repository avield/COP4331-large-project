"use client"

import { LabelList, RadialBar, RadialBarChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type ChartItem = {
    name: string
    value: number
    fill: string
}

export const description = "A radial chart with a label"

const chartConfig = {
  value: {
    label: 'Tasks',
  },
  Todo: {
    label: 'Todo',
    color: 'var(--chart-1)',
  },
  'In Progress': {
    label: 'In Progress',
    color: 'var(--chart-2)',
  },
  Blocked: {
    label: 'Blocked',
    color: 'var(--chart-3)',
  },
  Done: {
    label: 'Done',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig

interface ChartRadialLabelProps {
  data: ChartItem[]
}

export function ChartRadialLabel({ data }: ChartRadialLabelProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <RadialBarChart
        data={data}
        startAngle={-90}
        endAngle={380}
        innerRadius={30}
        outerRadius={110}
      >
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="name" />}
        />
        <RadialBar dataKey="value" background>
          <LabelList
            position="insideStart"
            dataKey="name"
            className="fill-white capitalize"
            fontSize={11}
          />
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  )
}