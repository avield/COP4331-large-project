"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ProgressChartTaskUser {
  _id?: string
  displayName?: string
  email?: string
  username?: string
}

export interface ProgressChartTask {
  id: string
  createdAt?: string | null
  completedAt?: string | null
  completedBy?: ProgressChartTaskUser | null
}

interface ProjectProgressAreaChartProps {
  tasks: ProgressChartTask[]
}

type ChartRow = {
  date: string
  created: number
  completed: number
}

const chartConfig = {
  created: {
    label: "Tasks Created",
    color: "var(--chart-1)",
  },
  completed: {
    label: "Tasks Completed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10)
}

export function ProjectProgressAreaChart({
  tasks,
}: ProjectProgressAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d")

  const chartData = React.useMemo<ChartRow[]>(() => {
    const createdDates = tasks
      .map((task) => task.createdAt)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter((date) => !Number.isNaN(date.getTime()))

    const completedDates = tasks
      .map((task) => task.completedAt)
      .filter(Boolean)
      .map((value) => new Date(value as string))
      .filter((date) => !Number.isNaN(date.getTime()))

    const allDates = [...createdDates, ...completedDates]

    if (allDates.length === 0) {
      return []
    }

    const latestDate = startOfDay(
      new Date(Math.max(...allDates.map((date) => date.getTime())))
    )

    let days = 30
    if (timeRange === "7d") days = 7
    if (timeRange === "90d") days = 90

    const startDate = new Date(latestDate)
    startDate.setDate(startDate.getDate() - (days - 1))

    const createdByDay = new Map<string, number>()
    const completedByDay = new Map<string, number>()

    for (const task of tasks) {
      if (task.createdAt) {
        const key = toDayKey(new Date(task.createdAt))
        createdByDay.set(key, (createdByDay.get(key) ?? 0) + 1)
      }

      if (task.completedAt) {
        const key = toDayKey(new Date(task.completedAt))
        completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1)
      }
    }

    const rows: ChartRow[] = []
    let cumulativeCreated = 0
    let cumulativeCompleted = 0

    const cursor = new Date(startDate)

    while (cursor <= latestDate) {
      const key = toDayKey(cursor)

      cumulativeCreated += createdByDay.get(key) ?? 0
      cumulativeCompleted += completedByDay.get(key) ?? 0

      rows.push({
        date: key,
        created: cumulativeCreated,
        completed: cumulativeCompleted,
      })

      cursor.setDate(cursor.getDate() + 1)
    }

    return rows
  }, [tasks, timeRange])

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>
            Created vs completed tasks over time
          </CardDescription>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a time range"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 90 days
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No task history yet.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.1}
                  />
                </linearGradient>

                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />

              <Area
                dataKey="created"
                type="monotone"
                fill="url(#fillCreated)"
                stroke="var(--color-created)"
              />
              <Area
                dataKey="completed"
                type="monotone"
                fill="url(#fillCompleted)"
                stroke="var(--color-completed)"
              />

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectProgressAreaChart