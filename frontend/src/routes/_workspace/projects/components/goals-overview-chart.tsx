"use client"

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"

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
  type ChartConfig,
} from "@/components/ui/chart"

export interface GoalsOverviewChartItem {
  name: string
  value: number
  fill?: string
}

interface GoalsOverviewChartProps {
  data: GoalsOverviewChartItem[]
}

const chartConfig = {
  value: {
    label: "Completion",
  },
  goal1: {
    label: "Goal 1",
    color: "var(--chart-1)",
  },
  goal2: {
    label: "Goal 2",
    color: "var(--chart-2)",
  },
  goal3: {
    label: "Goal 3",
    color: "var(--chart-3)",
  },
  goal4: {
    label: "Goal 4",
    color: "var(--chart-4)",
  },
  goal5: {
    label: "Goal 5",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function GoalsOverviewChart({ data }: GoalsOverviewChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.fill ?? `var(--chart-${(index % 5) + 1})`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals Overview</CardTitle>
        <CardDescription>
          Completion percentage for each goal
        </CardDescription>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No goals yet.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[360px] w-full"
          >
            <RadialBarChart
              data={chartData}
              innerRadius={40}
              outerRadius={160}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                tick={false}
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value, _name, item) => {
                      return `${item.payload.name}: ${value}%`
                    }}
                  />
                }
              />

              <RadialBar
                dataKey="value"
                background
                cornerRadius={10}
                label={{
                  position: "insideStart",
                  fill: "white",
                  fontSize: 12,
                }}
              />
            </RadialBarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default GoalsOverviewChart