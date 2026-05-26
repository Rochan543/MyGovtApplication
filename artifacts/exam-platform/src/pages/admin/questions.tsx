import { useState } from "react";
import {
  useListQuestions, getListQuestionsQueryKey,
  useCreateQuestion, useDeleteQuestion, useUpdateQuestion,
  useListExams, getListExamsQueryKey,
  useListSubjects, getListSubjectsQueryKey,
  useListQuizzes,
  getListQuizzesQueryKey,
  useListTopicMocks,
  getListTopicMocksQueryKey,
} from "@workspace/api-client-react";
import type { Question } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, FileText, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const qSchema = z.object({
  questionText: z.string().min(1, "Required"),
  optionA: z.string().min(1, "Required"),
  optionB: z.string().min(1, "Required"),
  optionC: z.string().min(1, "Required"),
  optionD: z.string().min(1, "Required"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().optional(),
  marks: z.coerce.number().default(1),
  negativeMarks: z.coerce.number().default(0),
  difficulty: z.string().optional(),
  examId: z.coerce.number().optional(),
  quizId: z.coerce.number().optional(),
  topicMockId: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
});
type QForm = z.infer<typeof qSchema>;

export default function AdminQuestionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [search, setSearch] = useState("");
  const [filterExamId, setFilterExamId] = useState<string>("");
  const [importExamId, setImportExamId] = useState("");
  const [importQuizId, setImportQuizId] = useState("");
  const [importTopicMockId, setImportTopicMockId] = useState("");

  const { data: exams } = useListExams({}, { query: { queryKey: getListExamsQueryKey({}) } });
  const { data: quizzes } = useListQuizzes(
  {},
  { query: { queryKey: getListQuizzesQueryKey({}) } }
);

const { data: topicMocks } = useListTopicMocks(
  {},
  { query: { queryKey: getListTopicMocksQueryKey({}) } }
);
  const { data: subjects } = useListSubjects({ query: { queryKey: getListSubjectsQueryKey() } });

  const params = { ...(filterExamId ? { examId: filterExamId } : {}) };
  const { data: questions, isLoading } = useListQuestions(params as Parameters<typeof useListQuestions>[0], {
    query: { queryKey: getListQuestionsQueryKey(params as Parameters<typeof useListQuestions>[0]) },
  });

  const form = useForm<QForm>({
    resolver: zodResolver(qSchema),
    defaultValues: { questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", marks: 1, negativeMarks: 0 },
  });

  const createQ = useCreateQuestion({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListQuestionsQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Question created" });
      },
    },
  });

  const updateQ = useUpdateQuestion({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListQuestionsQueryKey({}) });
        setOpen(false);
        setEditing(null);
        toast({ title: "Question updated" });
      },
    },
  });

  const deleteQ = useDeleteQuestion({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListQuestionsQueryKey({}) });
        toast({ title: "Question deleted" });
      },
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", marks: 1, negativeMarks: 0 });
    setOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    form.reset({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
      explanation: q.explanation ?? "",
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      difficulty: q.difficulty ?? "",
      examId: q.examId ?? undefined,
      quizId: q.quizId ?? undefined,
      topicMockId: q.topicMockId ?? undefined,
      year: q.year ?? undefined,
    });
    setOpen(true);
  };

  const onSubmit = (data: QForm) => {
    const payload = {
      ...data,
      examId: data.examId || undefined,
      quizId: data.quizId || undefined,
      topicMockId: data.topicMockId || undefined,
      year: data.year || undefined,
    };
    if (editing) {
      updateQ.mutate({ id: editing.id, data: payload });
    } else {
      createQ.mutate({ data: payload });
    }
  };

  const filtered = (questions ?? []).filter((q) =>
    !search || q.questionText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <PageHeader
        title="Question Bank"
        subtitle={`${(questions ?? []).length} questions`}
actions={
  <div className="flex flex-wrap gap-2">

    <select
      className="h-9 rounded border border-input bg-background px-3 text-sm"
      value={importExamId}
      onChange={(e) => setImportExamId(e.target.value)}
    >
      <option value="">Select Exam</option>
      {(exams ?? []).map((e) => (
        <option key={e.id} value={e.id}>
          {e.title}
        </option>
      ))}
    </select>

    <select
      className="h-9 rounded border border-input bg-background px-3 text-sm"
      value={importQuizId}
      onChange={(e) => setImportQuizId(e.target.value)}
    >
      <option value="">Select Quiz</option>
      {(quizzes ?? []).map((q) => (
        <option key={q.id} value={q.id}>
          {q.title}
        </option>
      ))}
    </select>

    <select
      className="h-9 rounded border border-input bg-background px-3 text-sm"
      value={importTopicMockId}
      onChange={(e) => setImportTopicMockId(e.target.value)}
    >
      <option value="">Select Topic Mock</option>
      {(topicMocks ?? []).map((t) => (
        <option key={t.id} value={t.id}>
          {t.title}
        </option>
      ))}
    </select>

    <input
      type="file"
      accept=".txt"
      id="txt-upload"
      className="hidden"
      onChange={async (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        const text = await file.text();

        try {

          const token = localStorage.getItem("accessToken");
          const res = await fetch("/api/questions/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text,
              examId: importExamId ? Number(importExamId) : undefined,
              quizId: importQuizId ? Number(importQuizId) : undefined,
              topicMockId: importTopicMockId ? Number(importTopicMockId) : undefined,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(errData.error ?? "Import failed");
          }

          qc.invalidateQueries({
            queryKey: getListQuestionsQueryKey({}),
          });

          toast({
            title: "Questions imported successfully",
          });

        } catch (err) {
          const msg = err instanceof Error ? err.message : "Import failed";
          toast({
            title: "Import failed",
            description: msg,
            variant: "destructive",
          });
        }
      }}
    />

    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        document
          .getElementById("txt-upload")
          ?.click()
      }
    >
      Import TXT
    </Button>

    <Button
      data-testid="button-create-question"
      size="sm"
      onClick={openCreate}
    >
      <Plus size={14} className="mr-1" />
      Add Question
    </Button>

  </div>
}
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              className="pl-8 h-8 text-sm"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            data-testid="select-exam-filter"
            className="h-8 rounded border border-input bg-background px-3 text-sm"
            value={filterExamId}
            onChange={(e) => setFilterExamId(e.target.value)}
          >
            <option value="">All Exams</option>
            {(exams ?? []).map((e) => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((q, idx) => (
              <Card key={q.id} data-testid={`card-question-${q.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1 font-medium">{idx + 1}. {q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">Ans: {q.correctAnswer}</Badge>
                        <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                        {q.difficulty && <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        data-testid={`button-edit-${q.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(q)}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        data-testid={`button-delete-${q.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteQ.mutate({ id: q.id })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p>No questions found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="questionText" render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <textarea className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[80px]" data-testid="input-question" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <FormField key={opt} control={form.control} name={`option${opt}` as "optionA" | "optionB" | "optionC" | "optionD"} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option {opt}</FormLabel>
                      <FormControl><Input data-testid={`input-option-${opt}`} placeholder={`Option ${opt}`} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <FormControl>
                      <select data-testid="select-correct" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" {...field}>
                        {["A", "B", "C", "D"].map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="marks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marks</FormLabel>
                    <FormControl><Input type="number" step="0.5" data-testid="input-marks" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="negativeMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negative</FormLabel>
                    <FormControl><Input type="number" step="0.25" data-testid="input-negative" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {/* <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="examId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Exam</FormLabel>
                    <FormControl>
                      <select data-testid="select-exam" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">None</option>
                        {(exams ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <FormControl>
                      <select data-testid="select-difficulty" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" {...field}>
                        <option value="">None</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div> */}
              <div className="grid grid-cols-3 gap-3">

  <FormField
    control={form.control}
    name="examId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Assign to Exam</FormLabel>
        <FormControl>
          <select
            className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          >
            <option value="">None</option>
            {(exams ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </FormControl>
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="quizId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Assign to Quiz</FormLabel>
        <FormControl>
          <select
            className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          >
            <option value="">None</option>
            {(quizzes ?? []).map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </FormControl>
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="topicMockId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Assign to Topic Mock</FormLabel>
        <FormControl>
          <select
            className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          >
            <option value="">None</option>
            {(topicMocks ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </FormControl>
      </FormItem>
    )}
  />

</div>
              <FormField control={form.control} name="explanation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (optional)</FormLabel>
                  <FormControl>
                    <textarea className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[60px]" data-testid="input-explanation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button data-testid="button-save" type="submit" className="flex-1" disabled={createQ.isPending || updateQ.isPending}>
                  {editing ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
