import { useState } from "react";
import { useListTopicMocks, getListTopicMocksQueryKey, useStartAttempt, useListSubjects, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { PenTool, Clock, BookOpen } from "lucide-react";

export default function TopicMocksPage() {
  const [, setLocation] = useLocation();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

  const { data: subjects } = useListSubjects({ query: { queryKey: getListSubjectsQueryKey() } });

  const params = { published: true };
  const { data: mocks, isLoading } = useListTopicMocks(params, {
    query: { queryKey: getListTopicMocksQueryKey(params) },
  });

  const startAttempt = useStartAttempt({
    mutation: {
      onSuccess: (attempt) => setLocation(`/exam-engine/${attempt.id}`),
    },
  });

  const filtered = (mocks ?? []).filter((m) => {
    if (!selectedSubjectId || selectedSubjectId === "all") return true;
    return (m as unknown as { subjectName?: string })?.subjectName === (subjects ?? []).find((s) => String(s.id) === selectedSubjectId)?.name;
  });

  return (
    <Layout>
      <PageHeader title="Topic Mocks" subtitle="Practice by subject and topic" />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={selectedSubjectId ?? "all"} onValueChange={(v) => setSelectedSubjectId(v === "all" ? undefined : v)}>
            <SelectTrigger data-testid="select-subject" className="w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects ?? []).map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <PenTool size={40} className="mx-auto mb-3 opacity-30" />
            <p>No topic mocks available</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((mock) => (
              <Card key={mock.id} data-testid={`card-mock-${mock.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {(mock as unknown as { subjectName?: string })?.subjectName ?? ""}
                    </Badge>
                    {(mock as unknown as { topicName?: string })?.topicName && (
                      <Badge variant="secondary" className="text-xs">
                        {(mock as unknown as { topicName?: string })?.topicName}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-3 leading-snug">{mock.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Clock size={11} />{mock.duration} min</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} />{mock.totalMarks} marks</span>
                  </div>
                  <Button
                    data-testid={`button-start-mock-${mock.id}`}
                    className="w-full h-8 text-xs"
                    onClick={() => startAttempt.mutate({ data: { entityType: "TOPIC_MOCK", entityId: mock.id } })}
                    disabled={startAttempt.isPending}
                  >
                    Start Mock
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
