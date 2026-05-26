import { useState, useRef } from "react";
import {
  useListFeeds, getListFeedsQueryKey,
  useCreateFeed, useUpdateFeed, useDeleteFeed,
} from "@workspace/api-client-react";
import type { Feed } from "@workspace/api-client-react";
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
import { Plus, Trash2, Pencil, Rss, ImageIcon, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const feedSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  imageUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
});
type FeedForm = z.infer<typeof feedSchema>;

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("accessToken");
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json() as { url: string };
  return data.url;
}

export default function AdminFeedsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Feed | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const params = {};
  const { data: feeds, isLoading } = useListFeeds(params, { query: { queryKey: getListFeedsQueryKey(params) } });

  const form = useForm<FeedForm>({
    resolver: zodResolver(feedSchema),
    defaultValues: { title: "", description: "", imageUrl: "", isPublished: false },
  });

  const createFeed = useCreateFeed({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFeedsQueryKey({}) });
        setOpen(false);
        form.reset();
        setImagePreview(null);
        toast({ title: "Feed post created" });
      },
    },
  });

  const updateFeed = useUpdateFeed({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFeedsQueryKey({}) });
        setOpen(false);
        setEditing(null);
        setImagePreview(null);
        toast({ title: "Feed post updated" });
      },
    },
  });

  const deleteFeed = useDeleteFeed({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFeedsQueryKey({}) });
        toast({ title: "Feed post deleted" });
      },
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", description: "", imageUrl: "", isPublished: false });
    setImagePreview(null);
    setOpen(true);
  };

  const openEdit = (f: Feed) => {
    setEditing(f);
    form.reset({
      title: f.title,
      description: f.description,
      imageUrl: f.imageUrl ?? "",
      isPublished: f.isPublished,
    });
    setImagePreview(f.imageUrl ?? null);
    setOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setImageUploading(true);

    try {
      const url = await uploadImage(file);
      form.setValue("imageUrl", url);
      toast({ title: "Image uploaded" });
    } catch {
      setImagePreview(null);
      form.setValue("imageUrl", "");
      toast({ title: "Image upload failed", variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    form.setValue("imageUrl", "");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: FeedForm) => {
    if (imageUploading) {
      toast({ title: "Please wait for image upload to finish", variant: "destructive" });
      return;
    }
    const payload = {
      ...data,
      imageUrl: data.imageUrl || undefined,
    };
    if (editing) {
      updateFeed.mutate({ id: editing.id, data: payload });
    } else {
      createFeed.mutate({ data: payload });
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Feed Panel"
        subtitle={`${(feeds ?? []).length} posts`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" />
            New Post
          </Button>
        }
      />

      <div className="p-6 space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded" />)}
          </div>
        ) : (feeds ?? []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Rss size={36} className="mx-auto mb-3 opacity-30" />
            <p>No feed posts yet. Create one to get started.</p>
          </div>
        ) : (
          (feeds ?? []).map((feed) => (
            <Card key={feed.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  {feed.imageUrl ? (
                    <img
                      src={feed.imageUrl}
                      alt={feed.title}
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{feed.title}</p>
                      <Badge variant={feed.isPublished ? "default" : "secondary"} className="text-xs flex-shrink-0">
                        {feed.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{feed.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(feed.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(feed)}>
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteFeed.mutate({ id: feed.id })}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setImagePreview(null); } setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Post" : "New Feed Post"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Post title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Content</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                      placeholder="Write your post content here..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-1">
                <label className="text-sm font-medium leading-none">Image (optional)</label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative w-full h-40 rounded overflow-hidden border border-input">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {imageUploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Uploading…</span>
                        </div>
                      )}
                      {!imageUploading && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded border border-dashed border-input flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground/40 transition-colors"
                    >
                      <Upload size={18} />
                      <span className="text-xs">Click to upload image</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              <FormField control={form.control} name="isPublished" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Publish immediately</FormLabel>
                  </div>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createFeed.isPending || updateFeed.isPending || imageUploading}>
                  {imageUploading ? "Uploading…" : editing ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
