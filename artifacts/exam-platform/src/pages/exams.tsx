import { useState } from "react";
import { useListExams, getListExamsQueryKey, useStartAttempt } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Search, Clock, FileText, ChevronRight } from "lucide-react";

const EXAM_TYPES = ["SSC", "RRB", "Banking", "UPSC", "State PSC", "Teaching"];

export default function ExamsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | undefined>();

  const params = { active: true, ...(selectedType ? { examType: selectedType } : {}) };
  const { data: exams, isLoading } = useListExams(params, {
    query: { queryKey: getListExamsQueryKey(params) },
  });

  const startAttempt = useStartAttempt({
    mutation: {
      onSuccess: (attempt) => setLocation(`/exam-engine/${attempt.id}`),
    },
  });

  const filtered = (exams ?? []).filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <PageHeader title="Exams" subtitle="Browse and start available mock exams" />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search exams..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              data-testid="button-filter-all"
              variant={!selectedType ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(undefined)}
            >
              All
            </Button>
            {EXAM_TYPES.map((type) => (
              <Button
                key={type}
                data-testid={`button-filter-${type.toLowerCase()}`}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type === selectedType ? undefined : type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No exams found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exam) => (
              <Card
                key={exam.id}
                data-testid={`card-exam-${exam.id}`}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/exams/${exam.id}`)}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge data-testid={`badge-type-${exam.id}`} variant="secondary" className="text-xs">
                      {exam.examType}
                    </Badge>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-semibold text-sm mb-3 leading-snug">{exam.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={11} />{exam.duration} min</span>
                    <span className="flex items-center gap-1"><FileText size={11} />{exam.totalMarks} marks</span>
                  </div>
                  <Button
                    data-testid={`button-start-${exam.id}`}
                    className="w-full mt-4 h-8 text-xs"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      startAttempt.mutate({ data: { entityType: "EXAM", entityId: exam.id } });
                    }}
                    disabled={startAttempt.isPending}
                  >
                    Start Exam
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
