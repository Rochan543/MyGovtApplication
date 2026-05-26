import { useState } from "react";
import {
  useListTopicMocks, getListTopicMocksQueryKey, useCreateTopicMock, useDeleteTopicMock,
  useToggleTopicMockPublish, useListTopics, getListTopicsQueryKey,
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
  topicId: z.coerce.number().min(1, "Required"),
  duration: z.coerce.number().min(1, "Required"),
  totalMarks: z.coerce.number().min(1, "Required"),
  negativeMarks: z.coerce.number().default(0),
});
type MockForm = z.infer<typeof schema>;

export default function AdminTopicMocksPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const params = {};
  const { data: mocks, isLoading } = useListTopicMocks(params, { query: { queryKey: getListTopicMocksQueryKey(params) } });
  const { data: topics } = useListTopics({}, { query: { queryKey: getListTopicsQueryKey({}) } });

  const form = useForm<MockForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", topicId: 0, duration: 20, totalMarks: 20, negativeMarks: 0 },
  });

  const createMock = useCreateTopicMock({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTopicMocksQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Topic mock created" });
      },
    },
  });

  const deleteMock = useDeleteTopicMock({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTopicMocksQueryKey({}) }),
    },
  });

  const toggleMock = useToggleTopicMockPublish({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListTopicMocksQueryKey({}) }),
    },
  });

  return (
    <Layout>
      <PageHeader
        title="Topic Mocks"
        subtitle="Manage topic-wise practice tests"
        actions={
          <Button data-testid="button-create-mock" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} className="mr-1" /> Create Mock
          </Button>
        }
      />

      <div className="p-3 sm:p-4 lg:p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
        ) : (
          <div className="space-y-2">
            {(mocks ?? []).map((mock) => (
              <Card key={mock.id} data-testid={`card-mock-${mock.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium truncate">{mock.title}</span>
                        <Badge variant={mock.published ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {mock.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{mock.duration} min</span>
                        <span>{mock.totalMarks} marks</span>
                        {(mock as unknown as { topicName?: string })?.topicName && (
                          <span className="text-primary">{(mock as unknown as { topicName?: string })?.topicName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 w-full sm:w-auto">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => toggleMock.mutate({ id: mock.id })}>
                        {mock.published ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button data-testid={`button-delete-${mock.id}`} variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMock.mutate({ id: mock.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(mocks ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap size={36} className="mx-auto mb-3 opacity-30" />
                <p>No topic mocks yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader><DialogTitle>Create Topic Mock</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMock.mutate({ data: d }))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input data-testid="input-title" placeholder="Algebra Mock Test 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="topicId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <select data-testid="select-topic" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}>
                      <option value={0}>Select topic...</option>
                      {(topics ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {(t as unknown as { subjectName?: string })?.subjectName} / {t.name}
                        </option>
                      ))}
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
                <Button data-testid="button-save" type="submit" className="flex-1" disabled={createMock.isPending}>Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
