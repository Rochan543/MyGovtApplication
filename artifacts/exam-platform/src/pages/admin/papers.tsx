import { useState } from "react";
import { useListPapers, getListPapersQueryKey, useCreatePaper, useDeletePaper } from "@workspace/api-client-react";
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
import { Plus, Trash2, ExternalLink, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  title: z.string().min(1, "Required"),
  examType: z.string().min(1, "Required"),
  year: z.coerce.number().optional(),
  fileUrl: z.string().url("Must be a valid URL"),
  fileType: z.enum(["pdf", "docx", "txt"]),
  fileName: z.string().min(1, "Required"),
  description: z.string().optional(),
});
type PaperForm = z.infer<typeof schema>;

const EXAM_TYPES = ["SSC", "RRB", "Banking", "UPSC", "State PSC", "Teaching", "Defence", "Other"];

export default function AdminPapersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const params = {};
  const { data: papers, isLoading } = useListPapers(params, { query: { queryKey: getListPapersQueryKey(params) } });

  const form = useForm<PaperForm>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", examType: "SSC", fileUrl: "", fileType: "pdf", fileName: "" },
  });

  const createPaper = useCreatePaper({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPapersQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Paper uploaded" });
      },
    },
  });

  const deletePaper = useDeletePaper({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPapersQueryKey({}) }),
    },
  });

  return (
    <Layout>
      <PageHeader
        title="Previous Year Papers"
        subtitle="Upload and manage exam papers"
        actions={
          <Button data-testid="button-upload-paper" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} className="mr-1" /> Upload Paper
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
        ) : (
          <div className="space-y-2">
            {(papers ?? []).map((paper) => (
              <Card key={paper.id} data-testid={`card-paper-${paper.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{paper.title}</span>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{paper.examType}</Badge>
                        {paper.year && <Badge variant="outline" className="text-xs flex-shrink-0">{paper.year}</Badge>}
                        <Badge variant="outline" className="text-xs uppercase flex-shrink-0">{paper.fileType}</Badge>
                      </div>
                      {paper.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{paper.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(paper.fileUrl, "_blank")}>
                        <ExternalLink size={12} />
                      </Button>
                      <Button data-testid={`button-delete-${paper.id}`} variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePaper.mutate({ id: paper.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(papers ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText size={36} className="mx-auto mb-3 opacity-30" />
                <p>No papers yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Paper</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createPaper.mutate({ data: { ...d, year: d.year || undefined } }))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input data-testid="input-title" placeholder="SSC CGL 2023 Tier 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="examType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <FormControl>
                      <select data-testid="select-exam-type" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" {...field}>
                        {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" data-testid="input-year" placeholder="2023" value={field.value ?? ""} onChange={field.onChange} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="fileUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cloudinary URL</FormLabel>
                  <FormControl><Input data-testid="input-file-url" placeholder="https://res.cloudinary.com/..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fileName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Name</FormLabel>
                    <FormControl><Input data-testid="input-file-name" placeholder="ssc-cgl-2023.pdf" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fileType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>File Type</FormLabel>
                    <FormControl>
                      <select data-testid="select-file-type" className="w-full h-9 rounded border border-input bg-background px-3 text-sm" {...field}>
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX</option>
                        <option value="txt">TXT</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input data-testid="input-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button data-testid="button-save" type="submit" className="flex-1" disabled={createPaper.isPending}>Upload</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
