import { useGetStudentDashboard, getGetStudentDashboardQueryKey, useStartAttempt, getGetExamQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { BookOpen, Target, Flame, BarChart2, ArrowRight, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useGetStudentDashboard({
    query: { queryKey: getGetStudentDashboardQueryKey() },
  });

  const startAttempt = useStartAttempt({
    mutation: {
      onSuccess: (attempt) => {
        setLocation(`/exam-engine/${attempt.id}`);
      },
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="Dashboard" />
        <div className="p-6 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded" />)}
        </div>
      </Layout>
    );
  }

  const stats = [
    { label: "Total Attempts", value: dashboard?.totalAttempts ?? 0, icon: BookOpen, color: "text-blue-500" },
    { label: "Avg Accuracy", value: `${(dashboard?.averageScore ?? 0).toFixed(1)}%`, icon: Target, color: "text-green-500" },
    { label: "Completed", value: dashboard?.completedExams ?? 0, icon: BarChart2, color: "text-purple-500" },
    { label: "Streak", value: `${dashboard?.weeklyStreak ?? 0}d`, icon: Flame, color: "text-orange-500" },
  ];

  return (
    <Layout>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0]}`}
        subtitle="Here's your preparation at a glance"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                  </div>
                  <Icon size={18} className={color} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Exams */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Available Exams
                <Button variant="ghost" size="sm" onClick={() => setLocation("/exams")} className="text-xs h-7">
                  View all <ArrowRight size={12} className="ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(dashboard?.activeExams ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active exams</p>
              ) : (
                (dashboard?.activeExams ?? []).slice(0, 4).map((exam: { id: number; title: string; examType: string; duration: number }) => (
                  <div
                    key={exam.id}
                    data-testid={`card-exam-${exam.id}`}
                    className="flex items-center justify-between p-3 rounded border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exam.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {exam.duration} min · {exam.examType}
                      </p>
                    </div>
                    <Button
                      data-testid={`button-start-exam-${exam.id}`}
                      size="sm"
                      className="h-7 text-xs ml-3"
                      onClick={() => startAttempt.mutate({ data: { entityType: "EXAM", entityId: exam.id } })}
                      disabled={startAttempt.isPending}
                    >
                      Start
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Recent Results
                <Button variant="ghost" size="sm" onClick={() => setLocation("/results")} className="text-xs h-7">
                  View all <ArrowRight size={12} className="ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(dashboard?.recentResults ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No results yet. Take an exam!</p>
              ) : (
                (dashboard?.recentResults ?? []).slice(0, 4).map((result: { id: number; attemptId: number; totalScore: number; maxScore: number; accuracy: number }) => (
                  <div
                    key={result.id}
                    data-testid={`card-result-${result.id}`}
                    className="flex items-center justify-between p-3 rounded border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/results/${result.attemptId}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">Score: {result.totalScore}/{result.maxScore}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Accuracy: {result.accuracy.toFixed(1)}%</p>
                    </div>
                    <Badge
                      data-testid={`badge-accuracy-${result.id}`}
                      variant={result.accuracy >= 70 ? "default" : result.accuracy >= 40 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {result.accuracy >= 70 ? "Good" : result.accuracy >= 40 ? "Average" : "Needs Work"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quizzes */}
        {(dashboard?.availableQuizzes ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Available Quizzes
                <Button variant="ghost" size="sm" onClick={() => setLocation("/quizzes")} className="text-xs h-7">
                  View all <ArrowRight size={12} className="ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {(dashboard?.availableQuizzes ?? []).map((quiz: { id: number; title: string; quizType: string; duration: number }) => (
                  <div
                    key={quiz.id}
                    data-testid={`card-quiz-${quiz.id}`}
                    className="p-3 rounded border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() =>
                      startAttempt.mutate({ data: { entityType: "QUIZ", entityId: quiz.id } })
                    }
                  >
                    <p className="text-sm font-medium truncate">{quiz.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{quiz.quizType} · {quiz.duration} min</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
