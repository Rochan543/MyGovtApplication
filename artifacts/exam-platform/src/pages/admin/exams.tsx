import { useState } from "react";
import {
  useListExams, getListExamsQueryKey,
  useCreateExam, useDeleteExam, useToggleExamPublish,
  useUpdateExam
} from "@workspace/api-client-react";
import type { Exam, ExamInput } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Clock, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const examSchema = z.object({
  title: z.string().min(1, "Required"),
  examType: z.string().min(1, "Required"),
  duration: z.coerce.number().min(1, "Required"),
  totalMarks: z.coerce.number().min(1, "Required"),
  negativeMarks: z.coerce.number().default(0),
  description: z.string().optional(),
  instructions: z.string().optional(),
  hasSectionalTimer: z.boolean().default(false),
});
type ExamForm = z.infer<typeof examSchema>;

const EXAM_TYPES = ["SSC", "RRB", "Banking", "UPSC", "State PSC", "Teaching", "Defence", "Other"];

export default function AdminExamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);

  const params = {};
  const { data: exams, isLoading } = useListExams(params, { query: { queryKey: getListExamsQueryKey(params) } });

  const form = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: { title: "", examType: "SSC", duration: 60, totalMarks: 100, negativeMarks: 0, hasSectionalTimer: false },
  });

  const createExam = useCreateExam({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Exam created" });
      },
    },
  });

  const updateExam = useUpdateExam({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
        setOpen(false);
        setEditing(null);
        form.reset();
        toast({ title: "Exam updated" });
      },
    },
  });

  const deleteExam = useDeleteExam({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
        toast({ title: "Exam deleted" });
      },
    },
  });

  const togglePublish = useToggleExamPublish({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListExamsQueryKey({}) }),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", examType: "SSC", duration: 60, totalMarks: 100, negativeMarks: 0, hasSectionalTimer: false });
    setOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    form.reset({
      title: exam.title,
      examType: exam.examType,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      negativeMarks: exam.negativeMarks ?? 0,
      description: exam.description ?? "",
      instructions: exam.instructions ?? "",
      hasSectionalTimer: exam.hasSectionalTimer ?? false,
    });
    setOpen(true);
  };

  const onSubmit = (data: ExamForm) => {
    if (editing) {
      updateExam.mutate({ id: editing.id, data: data as Parameters<typeof updateExam.mutate>[0]["data"] });
    } else {
      createExam.mutate({ data: data as ExamInput });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Exams"
        subtitle="Manage all mock exams"
        actions={
          <Button data-testid="button-create-exam" size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" /> Create Exam
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(exams ?? []).map((exam) => (
              <Card key={exam.id} data-testid={`card-exam-${exam.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{exam.title}</span>
                        <Badge variant={exam.active ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {exam.active ? "Active" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{exam.examType}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock size={10} />{exam.duration} min</span>
                        <span className="flex items-center gap-1"><BookOpen size={10} />{exam.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        data-testid={`button-toggle-${exam.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => togglePublish.mutate({ id: exam.id })}
                      >
                        {exam.active ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button
                        data-testid={`button-edit-${exam.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => openEdit(exam)}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        data-testid={`button-delete-${exam.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => deleteExam.mutate({ id: exam.id })}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(exams ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
                <p>No exams yet. Create your first exam.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Exam" : "Create Exam"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input data-testid="input-title" placeholder="SSC CGL Mock Test 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="examType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <FormControl>
                      <select
                        data-testid="select-exam-type"
                        className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
                        {...field}
                      >
                        {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input data-testid="input-duration" type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="totalMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl><Input data-testid="input-marks" type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="negativeMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negative Marks</FormLabel>
                    <FormControl><Input data-testid="input-negative" type="number" step="0.25" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="instructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                      data-testid="input-instructions"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hasSectionalTimer" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      data-testid="checkbox-sectional-timer"
                      id="sectional"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded"
                    />
                    <FormLabel htmlFor="sectional" className="!mt-0 cursor-pointer">Enable sectional timer</FormLabel>
                  </div>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-2">
                <Button
                  data-testid="button-cancel"
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  data-testid="button-save"
                  type="submit"
                  className="flex-1"
                  disabled={createExam.isPending || updateExam.isPending}
                >
                  {editing ? "Save Changes" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
