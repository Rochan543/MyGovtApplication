import { useState } from "react";
import {
  useListSections, getListSectionsQueryKey, useCreateSection, useDeleteSection, useUpdateSection,
  useListExams, getListExamsQueryKey,
} from "@workspace/api-client-react";
import type { Section } from "@workspace/api-client-react";
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
import { Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Required"),
  examId: z.coerce.number().min(1, "Required"),
  duration: z.coerce.number().default(0),
  order: z.coerce.number().default(0),
});
type SectionForm = z.infer<typeof schema>;

export default function AdminSectionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [filterExamId, setFilterExamId] = useState<string>("");

  const { data: exams } = useListExams({}, { query: { queryKey: getListExamsQueryKey({}) } });

  const params = filterExamId ? { examId: filterExamId } : {};
  const { data: sections, isLoading } = useListSections(params as Parameters<typeof useListSections>[0], {
    query: { queryKey: getListSectionsQueryKey(params as Parameters<typeof useListSections>[0]) },
  });

  const form = useForm<SectionForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", examId: 0, duration: 0, order: 0 },
  });

  const createSection = useCreateSection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSectionsQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Section created" });
      },
    },
  });

  const updateSection = useUpdateSection({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSectionsQueryKey({}) });
        setOpen(false);
        setEditing(null);
        toast({ title: "Section updated" });
      },
    },
  });

  const deleteSection = useDeleteSection({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSectionsQueryKey({}) }),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", examId: filterExamId ? Number(filterExamId) : 0, duration: 0, order: 0 });
    setOpen(true);
  };

  const openEdit = (s: Section) => {
    setEditing(s);
    form.reset({ name: s.name, examId: s.examId, duration: s.duration, order: s.order });
    setOpen(true);
  };

  const onSubmit = (data: SectionForm) => {
    if (editing) {
      updateSection.mutate({ id: editing.id, data });
    } else {
      createSection.mutate({ data });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Sections"
        subtitle="Manage exam sections"
        actions={
          <Button data-testid="button-create-section" size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" /> Add Section
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <select
          data-testid="select-exam-filter"
          className="h-8 rounded border border-input bg-background px-3 text-sm"
          value={filterExamId}
          onChange={(e) => setFilterExamId(e.target.value)}
        >
          <option value="">All Exams</option>
          {(exams ?? []).map((e) => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
        </select>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
        ) : (
          <div className="space-y-2">
            {(sections ?? []).map((section) => (
              <Card key={section.id} data-testid={`card-section-${section.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{section.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {section.duration > 0 && <Badge variant="secondary" className="text-xs">{section.duration} min</Badge>}
                        <span className="text-xs text-muted-foreground">Order: {section.order}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button data-testid={`button-edit-${section.id}`} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(section)}>
                        <Pencil size={12} />
                      </Button>
                      <Button data-testid={`button-delete-${section.id}`} variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSection.mutate({ id: section.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(sections ?? []).length === 0 && (
              <p className="text-center py-10 text-muted-foreground">No sections yet</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Section" : "Add Section"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Name</FormLabel>
                  <FormControl><Input data-testid="input-name" placeholder="General Intelligence" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="examId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam</FormLabel>
                  <FormControl>
                    <select data-testid="select-exam" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}>
                      <option value={0}>Select exam...</option>
                      {(exams ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input type="number" data-testid="input-duration" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="order" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl><Input type="number" data-testid="input-order" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button data-testid="button-save" type="submit" className="flex-1" disabled={createSection.isPending || updateSection.isPending}>
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
