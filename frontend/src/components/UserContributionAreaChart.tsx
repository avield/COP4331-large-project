import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface ContributionTask {
    id: string
    completedAt?: string | null
    status?: string
}

interface UserContributionAreaChartProps {
    tasks: ContributionTask[]
    displayName: string
}

export function UserContributionAreaChart({ tasks, displayName }: UserContributionAreaChartProps) {
    const [timeRange, setTimeRange] = useState("90d")

    // Process data to count completions per day
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {}

        tasks.forEach((task) => {
            if (task.completedAt) {
                // Normalize date to YYYY-MM-DD
                const date = new Date(task.completedAt).toISOString().split('T')[0]
                counts[date] = (counts[date] || 0) + 1
            }
        })

        // Convert to array format required by Recharts
        return Object.entries(counts)
            .map(([date, count]) => ({
                date,
                completed: count,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [tasks])

    // Filter data based on selected time range
    const filteredData = useMemo(() => {
        const now = new Date()
        let daysToSubtract = 90

        if (timeRange === "30d") daysToSubtract = 30
        if (timeRange === "7d") daysToSubtract = 7

        const startDate = new Date()
        startDate.setDate(now.getDate() - daysToSubtract)

        // Ensure we show dates even if they have 0 completions to keep the chart continuous
        return chartData.filter((d) => new Date(d.date) >= startDate)
    }, [chartData, timeRange])

    return (
        <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Contribution Activity</CardTitle>
                    <CardDescription>
                        Tracking completed tasks for {displayName}
                    </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-40 rounded-lg sm:ml-auto">
                        <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="90d">Last 3 months</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {filteredData.length === 0 ? (
                    <div className="flex h-62.5 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        No completions recorded in this period.
                    </div>
                ) : (
                    <ChartContainer
                        config={{
                            completed: {
                                label: "Tasks Completed",
                                // Using Emerald-500 for the config
                                color: "#10b981",
                            },
                        }}
                        className="aspect-auto h-62.5 w-full"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredData}>
                                <defs>
                                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                        {/* Hardcoding the green here ensures it works regardless of CSS var settings */}
                                        <stop
                                            offset="5%"
                                            stopColor="#10b981"
                                            stopOpacity={0.4}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#10b981"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                {/* Softened grid lines for dark mode */}
                                <CartesianGrid vertical={false} stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }} // Lighter text
                                    tickFormatter={(value) => {
                                        const date = new Date(value)
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    allowDecimals={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <ChartTooltip
                                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                                    content={
                                        <ChartTooltipContent
                                            className="bg-slate-950 border-emerald-500/50"
                                            labelFormatter={(value) => {
                                                return new Date(value).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })
                                            }}
                                            indicator="dot"
                                        />
                                    }
                                />
                                <Area
                                    dataKey="completed"
                                    type="monotone"
                                    fill="url(#fillCompleted)"
                                    stroke="#10b981" // Vivid emerald stroke
                                    strokeWidth={2.5} // Slightly thicker for visibility
                                    activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}