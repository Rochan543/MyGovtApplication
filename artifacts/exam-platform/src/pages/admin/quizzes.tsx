import { useState } from "react";
import {
  useListQuizzes, getListQuizzesQueryKey, useCreateQuiz, useDeleteQuiz, useToggleQuizPublish,
} from "@workspace/api-client-react";
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
import { Plus, Trash2, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().min(1, "Required"),
  quizType: z.string().min(1, "Required"),
  duration: z.coerce.number().min(1, "Required"),
  totalMarks: z.coerce.number().min(1, "Required"),
  negativeMarks: z.coerce.number().default(0),
});
type QuizForm = z.infer<typeof schema>;

const QUIZ_TYPES = ["DAILY", "WEEKLY", "TOPIC", "PRACTICE", "MOCK"];

export default function AdminQuizzesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const params = {};
  const { data: quizzes, isLoading } = useListQuizzes(params, { query: { queryKey: getListQuizzesQueryKey(params) } });

  const form = useForm<QuizForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", quizType: "PRACTICE", duration: 15, totalMarks: 15, negativeMarks: 0 },
  });

  const createQuiz = useCreateQuiz({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListQuizzesQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Quiz created" });
      },
    },
  });

  const deleteQuiz = useDeleteQuiz({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListQuizzesQueryKey({}) }),
    },
  });

  const toggleQuiz = useToggleQuizPublish({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListQuizzesQueryKey({}) }),
    },
  });

  return (
    <Layout>
      <PageHeader
        title="Quizzes"
        subtitle="Manage daily, weekly and practice quizzes"
        actions={
          <Button data-testid="button-create-quiz" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} className="mr-1" /> Create Quiz
          </Button>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
        ) : (
          <div className="space-y-2">
            {(quizzes ?? []).map((quiz) => (
              <Card key={quiz.id} data-testid={`card-quiz-${quiz.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium break-words">{quiz.title}</span>
                        <Badge variant={quiz.published ? "default" : "secondary"} className="text-xs flex-shrink-0">{quiz.published ? "Published" : "Draft"}</Badge>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{quiz.quizType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{quiz.duration} min · {quiz.totalMarks} marks</p>
                    </div>
                    <div className="flex justify-end gap-1 w-full sm:w-auto">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => toggleQuiz.mutate({ id: quiz.id })}>
                        {quiz.published ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button data-testid={`button-delete-${quiz.id}`} variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteQuiz.mutate({ id: quiz.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(quizzes ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap size={36} className="mx-auto mb-3 opacity-30" />
                <p>No quizzes yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createQuiz.mutate({ data: d }))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input data-testid="input-title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quizType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz Type</FormLabel>
                  <FormControl>
                    <select data-testid="select-type" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" {...field}>
                      {QUIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="totalMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="negativeMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negative</FormLabel>
                    <FormControl><Input type="number" step="0.25" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button data-testid="button-save" type="submit" className="flex-1" disabled={createQuiz.isPending}>Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
