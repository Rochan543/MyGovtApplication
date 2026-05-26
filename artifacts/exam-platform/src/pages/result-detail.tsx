import { useParams, useLocation } from "wouter";
import { useGetResult, getGetResultQueryKey, useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, MinusCircle, Trophy, BarChart2, BookOpen } from "lucide-react";

export default function ResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(attemptId, 10);

  const { data: result, isLoading } = useGetResult(id, {
    query: { enabled: !!id, queryKey: getGetResultQueryKey(id) },
  });

  const { data: leaderboard } = useGetLeaderboard(id, {
    query: { enabled: !!id, queryKey: getGetLeaderboardQueryKey(id) },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded" />
        </div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="p-6 text-center py-16 text-muted-foreground">Result not found</div>
      </Layout>
    );
  }

  const answers = (result as unknown as { answers?: { questionId: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; selectedOption: string | null; correctAnswer: string; isCorrect: boolean; explanation: string | null; marks: number }[] })?.answers ?? [];
  const sectionAnalysis = (result as unknown as { sectionAnalysis?: { sectionId: number; sectionName: string; correct: number; wrong: number; skipped: number; score: number }[] })?.sectionAnalysis ?? [];

  const pct = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;

  return (
    <Layout>
      <PageHeader
        title="Result"
        subtitle={(result as unknown as { examTitle?: string })?.examTitle ?? "Exam Result"}
        actions={
          <Button variant="outline" size="sm" onClick={() => setLocation("/exams")}>
            Take Another Exam
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Score card */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Score", value: `${result.totalScore}/${result.maxScore}`, icon: Trophy, color: "text-yellow-500" },
            { label: "Accuracy", value: `${result.accuracy.toFixed(1)}%`, icon: BarChart2, color: pct >= 70 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500" },
            { label: "Correct", value: result.correctCount, icon: CheckCircle2, color: "text-green-500" },
            { label: "Wrong", value: result.wrongCount, icon: XCircle, color: "text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`card-stat-${label.toLowerCase()}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{String(value)}</p>
                  </div>
                  <Icon size={18} className={color} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Score bar */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Performance</span>
              <span className="text-sm text-muted-foreground">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>Cutoff: 40%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="answers">
          <TabsList>
            <TabsTrigger value="answers">Answer Review</TabsTrigger>
            {sectionAnalysis.length > 0 && <TabsTrigger value="sections">Section Analysis</TabsTrigger>}
            {leaderboard && leaderboard.length > 0 && <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>}
          </TabsList>

          <TabsContent value="answers" className="space-y-3 mt-4">
            {answers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No answer data available</p>
            )}
            {answers.map((a, idx) => (
              <Card
                key={a.questionId}
                data-testid={`card-answer-${a.questionId}`}
                className={`border ${a.isCorrect ? "border-green-200" : a.selectedOption ? "border-red-200" : "border-border"}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {a.isCorrect ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : a.selectedOption ? (
                        <XCircle size={16} className="text-red-500" />
                      ) : (
                        <MinusCircle size={16} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-2">{idx + 1}. {a.questionText}</p>
                      <div className="grid grid-cols-2 gap-1 mb-3">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const key = `option${opt}` as "optionA" | "optionB" | "optionC" | "optionD";
                          const text = a[key];
                          const isCorrect = a.correctAnswer === opt;
                          const isSelected = a.selectedOption === opt;
                          return (
                            <div
                              key={opt}
                              className={`text-xs p-2 rounded border ${
                                isCorrect ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                                isSelected ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                                "border-border text-muted-foreground"
                              }`}
                            >
                              <span className="font-mono mr-1">{opt}.</span>{text}
                            </div>
                          );
                        })}
                      </div>
                      {a.explanation && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <BookOpen size={10} className="inline mr-1" />
                          {a.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {sectionAnalysis.length > 0 && (
            <TabsContent value="sections" className="mt-4">
              <div className="space-y-3">
                {sectionAnalysis.map((s) => (
                  <Card key={s.sectionId} data-testid={`card-section-${s.sectionId}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">{s.sectionName}</span>
                        <span className="text-sm font-bold">{s.score} marks</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                          <p className="text-lg font-bold text-green-600">{s.correct}</p>
                          <p className="text-xs text-muted-foreground">Correct</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
                          <p className="text-lg font-bold text-red-600">{s.wrong}</p>
                          <p className="text-xs text-muted-foreground">Wrong</p>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <p className="text-lg font-bold">{s.skipped}</p>
                          <p className="text-xs text-muted-foreground">Skipped</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {leaderboard && leaderboard.length > 0 && (
            <TabsContent value="leaderboard" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 20).map((entry: { rank: number; userName: string; totalScore: number; accuracy: number }) => (
                      <div
                        key={entry.rank}
                        data-testid={`row-leaderboard-${entry.rank}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold w-6 text-center ${entry.rank <= 3 ? "text-yellow-500" : "text-muted-foreground"}`}>
                            #{entry.rank}
                          </span>
                          <span className="text-sm">{entry.userName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{entry.totalScore} pts</span>
                          <Badge variant="secondary">{entry.accuracy.toFixed(1)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
