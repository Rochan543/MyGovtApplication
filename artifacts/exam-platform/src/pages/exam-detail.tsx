import { useParams, useLocation } from "wouter";
import { useGetExam, getGetExamQueryKey, useStartAttempt } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, Target, AlertCircle, ChevronRight } from "lucide-react";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const examId = parseInt(id, 10);

  const { data: exam, isLoading } = useGetExam(examId, {
    query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) },
  });

  const startAttempt = useStartAttempt({
    mutation: {
      onSuccess: (attempt) => setLocation(`/exam-engine/${attempt.id}`),
    },
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

  if (!exam) {
    return (
      <Layout>
        <div className="p-6 text-center text-muted-foreground py-16">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>Exam not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={exam.title}
        subtitle={exam.examType}
        actions={
          <Button
            data-testid="button-start-exam"
            onClick={() => startAttempt.mutate({ data: { entityType: "EXAM", entityId: examId } })}
            disabled={startAttempt.isPending}
          >
            Start Exam <ChevronRight size={14} className="ml-1" />
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Duration", value: `${exam.duration} min`, icon: Clock },
            { label: "Total Marks", value: exam.totalMarks, icon: Target },
            { label: "Negative Marks", value: exam.negativeMarks ?? 0, icon: AlertCircle },
            { label: "Questions", value: ((exam as unknown as { questions?: unknown[] }).questions?.length ?? "—"), icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} data-testid={`card-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold mt-1">{String(value)}</p>
                  </div>
                  <Icon size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Instructions */}
          {exam.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{exam.instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          {(exam as unknown as { sections?: { id: number; name: string; duration: number }[] }).sections && (exam as unknown as { sections?: { id: number; name: string; duration: number }[] }).sections!.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(exam as unknown as { sections: { id: number; name: string; duration: number }[] }).sections.map((section) => (
                  <div
                    key={section.id}
                    data-testid={`row-section-${section.id}`}
                    className="flex items-center justify-between p-3 rounded border border-border"
                  >
                    <span className="text-sm font-medium">{section.name}</span>
                    {section.duration > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {section.duration} min
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Important Notes */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Once started, the exam cannot be paused.</p>
                {exam.negativeMarks && exam.negativeMarks > 0 && (
                  <p>{exam.negativeMarks} marks will be deducted for each wrong answer.</p>
                )}
                {exam.hasSectionalTimer && <p>This exam has section-wise time limits.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
