import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, FileText, Activity, Zap, PenTool, Target } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });

  const tiles = [
    { label: "Total Students", value: stats?.totalStudents ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Total Exams", value: stats?.totalExams ?? 0, icon: BookOpen, color: "text-purple-500" },
    { label: "Active Exams", value: stats?.activeExams ?? 0, icon: Activity, color: "text-green-500" },
    { label: "Questions", value: stats?.totalQuestions ?? 0, icon: FileText, color: "text-orange-500" },
    { label: "Total Attempts", value: stats?.totalAttempts ?? 0, icon: Target, color: "text-pink-500" },
    { label: "Quizzes", value: stats?.totalQuizzes ?? 0, icon: Zap, color: "text-indigo-500" },
    { label: "Topic Mocks", value: stats?.totalTopicMocks ?? 0, icon: PenTool, color: "text-cyan-500" },
    { label: "Papers", value: stats?.totalPapers ?? 0, icon: FileText, color: "text-teal-500" },
  ];

  return (
    <Layout>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview and key metrics" />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map(({ label, value, icon: Icon, color }) => (
              <Card key={label} data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
                    </div>
                    <Icon size={18} className={color} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Exam type breakdown */}
          {stats?.examTypeBreakdown && (stats.examTypeBreakdown as unknown[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Exam Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(stats.examTypeBreakdown as { examType: string; count: number }[]).map((item) => {
                  const total = (stats.examTypeBreakdown as { count: number }[]).reduce((s, i) => s + i.count, 0);
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.examType} data-testid={`row-exam-type-${item.examType.toLowerCase()}`}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{item.examType}</span>
                        <span className="text-muted-foreground">{item.count} exams</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent attempts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent Attempts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!stats?.recentAttempts || stats.recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No attempts yet</p>
              ) : (
                stats.recentAttempts.map((a: { id: number; entityType: string; status: string; startedAt: string }) => (
                  <div key={a.id} data-testid={`row-attempt-${a.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-xs font-medium">{a.entityType} #{a.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.startedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === "SUBMITTED" ? "bg-green-100 text-green-700" :
                      a.status === "AUTO_SUBMITTED" ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{a.status}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
