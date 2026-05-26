import { useState } from "react";
import {
  useListSubjects, getListSubjectsQueryKey, useCreateSubject, useDeleteSubject, useUpdateSubject,
  useListTopics, getListTopicsQueryKey, useCreateTopic, useDeleteTopic,
} from "@workspace/api-client-react";
import type { Subject, Topic } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const subjectSchema = z.object({ name: z.string().min(1, "Required"), description: z.string().optional() });
const topicSchema = z.object({ name: z.string().min(1, "Required"), subjectId: z.coerce.number().min(1) });
type SubjectForm = z.infer<typeof subjectSchema>;
type TopicForm = z.infer<typeof topicSchema>;

export default function AdminSubjectsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());

  const { data: subjects, isLoading } = useListSubjects({ query: { queryKey: getListSubjectsQueryKey() } });
  const { data: topics } = useListTopics({}, { query: { queryKey: getListTopicsQueryKey({}) } });

  const subjectForm = useForm<SubjectForm>({ resolver: zodResolver(subjectSchema), defaultValues: { name: "", description: "" } });
  const topicForm = useForm<TopicForm>({ resolver: zodResolver(topicSchema), defaultValues: { name: "", subjectId: 0 } });

  const createSubject = useCreateSubject({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
        setSubjectOpen(false);
        subjectForm.reset();
        toast({ title: "Subject created" });
      },
    },
  });

  const deleteSubject = useDeleteSubject({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
        toast({ title: "Subject deleted" });
      },
    },
  });

  const createTopic = useCreateTopic({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTopicsQueryKey({}) });
        setTopicOpen(false);
        topicForm.reset();
        toast({ title: "Topic created" });
      },
    },
  });

  const deleteTopic = useDeleteTopic({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTopicsQueryKey({}) }),
    },
  });

  const toggle = (id: number) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAddTopic = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    topicForm.reset({ name: "", subjectId });
    setTopicOpen(true);
  };

  return (
    <Layout>
      <PageHeader
        title="Subjects & Topics"
        subtitle="Organize your question bank by subject and topic"
        actions={
          <Button data-testid="button-create-subject" size="sm" onClick={() => setSubjectOpen(true)}>
            <Plus size={14} className="mr-1" /> Add Subject
          </Button>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-3">
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
        ) : (
          (subjects ?? []).map((subject) => {
            const subjectTopics = (topics ?? []).filter((t) => t.subjectId === subject.id);
            const expanded = expandedSubjects.has(subject.id);
            return (
              <Card key={subject.id} data-testid={`card-subject-${subject.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      data-testid={`button-expand-${subject.id}`}
                      className="flex flex-wrap items-center gap-2 text-sm font-medium hover:text-primary transition-colors text-left"
                      onClick={() => toggle(subject.id)}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {subject.name}
                      <Badge variant="secondary" className="text-xs">{subjectTopics.length} topics</Badge>
                    </button>
                    <div className="flex justify-end gap-1 w-full sm:w-auto">
                      <Button
                        data-testid={`button-add-topic-${subject.id}`}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openAddTopic(subject.id)}
                      >
                        <Plus size={11} className="mr-1" /> Topic
                      </Button>
                      <Button
                        data-testid={`button-delete-subject-${subject.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteSubject.mutate({ id: subject.id })}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                  {expanded && subjectTopics.length > 0 && (
                    <div className="mt-3 ml-5 space-y-1">
                      {subjectTopics.map((topic) => (
                        <div key={topic.id} data-testid={`row-topic-${topic.id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1.5 px-3 rounded hover:bg-muted/50 transition-colors">
                          <span className="text-sm">{topic.name}</span>
                          <Button
                            data-testid={`button-delete-topic-${topic.id}`}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteTopic.mutate({ id: topic.id })}
                          >
                            <Trash2 size={10} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {expanded && subjectTopics.length === 0 && (
                    <p className="text-xs text-muted-foreground ml-5 mt-2">No topics yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
        {!isLoading && (subjects ?? []).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No subjects yet</div>
        )}
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit((d) => createSubject.mutate({ data: d }))} className="space-y-4">
              <FormField control={subjectForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl><Input data-testid="input-subject-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={subjectForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input data-testid="input-subject-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setSubjectOpen(false)}>Cancel</Button>
                <Button data-testid="button-save-subject" type="submit" className="flex-1" disabled={createSubject.isPending}>Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={topicOpen} onOpenChange={setTopicOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Topic</DialogTitle></DialogHeader>
          <Form {...topicForm}>
            <form onSubmit={topicForm.handleSubmit((d) => createTopic.mutate({ data: d }))} className="space-y-4">
              <FormField control={topicForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Name</FormLabel>
                  <FormControl><Input data-testid="input-topic-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setTopicOpen(false)}>Cancel</Button>
                <Button data-testid="button-save-topic" type="submit" className="flex-1" disabled={createTopic.isPending}>Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
