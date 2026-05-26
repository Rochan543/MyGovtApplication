import { useGetAnalytics, getGetAnalyticsQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useGetAnalytics({
    query: { queryKey: getGetAnalyticsQueryKey() },
  });

  return (
    <Layout>
      <PageHeader title="Analytics" subtitle="Platform-wide performance and usage metrics" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded" />
            <Skeleton className="h-64 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attempts by date */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Attempts Over Time</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {!analytics?.attemptsByDate || analytics.attemptsByDate.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.attemptsByDate.slice(-14)}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={(v: string) => `Date: ${v}`}
                        formatter={(v: number) => [v, "Attempts"]}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Score distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {!analytics?.scoreDistribution || analytics.scoreDistribution.every((s: { count: number }) => s.count === 0) ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    No result data yet
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={analytics.scoreDistribution}
                          dataKey="count"
                          nameKey="range"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                        >
                          {analytics.scoreDistribution.map((_: unknown, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 w-full sm:w-auto">
                      {analytics.scoreDistribution.map((item: { range: string; count: number }, i: number) => (
                        <div key={item.range} data-testid={`row-score-${item.range}`} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-muted-foreground">{item.range}</span>
                          <span className="text-xs font-medium ml-auto">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
