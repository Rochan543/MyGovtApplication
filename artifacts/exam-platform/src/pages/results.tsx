import { useListResults, getListResultsQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Trophy, BarChart2, FileText, ChevronRight } from "lucide-react";

export default function ResultsPage() {
  const [, setLocation] = useLocation();

  const { data: results, isLoading } = useListResults({
    query: { queryKey: getListResultsQueryKey() },
  });

  return (
    <Layout>
      <PageHeader title="My Results" subtitle="History of all your exam attempts" />

      <div className="p-3 sm:p-4 lg:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
          </div>
        ) : !results || results.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
            <p>No results yet. Take an exam to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => {
              const pct = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;
              return (
                <Card
                  key={result.id}
                  data-testid={`card-result-${result.id}`}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/results/${result.attemptId}`)}
                >
                  <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium break-words">
                          {(result as unknown as { examTitle?: string })?.examTitle ?? "Exam"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Trophy size={10} /> {result.totalScore}/{result.maxScore} marks
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart2 size={10} /> {result.accuracy.toFixed(1)}% accuracy
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText size={10} /> {result.correctCount}✓ {result.wrongCount}✗ {result.skippedCount}—
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto sm:ml-4">
                        <Badge
                          data-testid={`badge-result-${result.id}`}
                          variant={pct >= 70 ? "default" : pct >= 40 ? "secondary" : "destructive"}
                        >
                          {pct.toFixed(0)}%
                        </Badge>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
