import { useListQuizzes, getListQuizzesQueryKey, useStartAttempt } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Zap, Clock, FileText } from "lucide-react";

export default function QuizzesPage() {
  const [, setLocation] = useLocation();

  const params = { published: true };
  const { data: quizzes, isLoading } = useListQuizzes(params, {
    query: { queryKey: getListQuizzesQueryKey(params) },
  });

  const startAttempt = useStartAttempt({
    mutation: {
      onSuccess: (attempt) => setLocation(`/quiz-engine/${attempt.id}`),
    },
  });

  return (
    <Layout>
      <PageHeader title="Quizzes" subtitle="Daily, weekly, and practice quizzes" />

      <div className="p-6">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded" />)}
          </div>
        ) : !quizzes || quizzes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p>No quizzes available yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} data-testid={`card-quiz-${quiz.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">{quiz.quizType}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-3 leading-snug">{quiz.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Clock size={11} />{quiz.duration} min</span>
                    <span className="flex items-center gap-1"><FileText size={11} />{quiz.totalMarks} marks</span>
                  </div>
                  <Button
                    data-testid={`button-start-quiz-${quiz.id}`}
                    className="w-full h-8 text-xs"
                    onClick={() => startAttempt.mutate({ data: { entityType: "QUIZ", entityId: quiz.id } })}
                    disabled={startAttempt.isPending}
                  >
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
