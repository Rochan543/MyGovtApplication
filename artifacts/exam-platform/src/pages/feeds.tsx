import {
  useListFeeds,
  getListFeedsQueryKey,
} from "@workspace/api-client-react";

import { Layout, PageHeader } from "@/components/Layout";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Heart,
  MessageCircle,
  Share2,
  Rss,
} from "lucide-react";

export default function FeedsPage() {

  const qc = useQueryClient();

  const params = {
    published: true,
  };

  const {
    data: feeds,
    isLoading,
  } = useListFeeds(params, {
    query: {
      queryKey: getListFeedsQueryKey(params),
    },
  });

  return (
    <Layout>

      <PageHeader
        title="News Feed"
        subtitle="Latest updates and announcements"
      />

      <div className="w-full flex justify-center px-3 sm:px-6 pb-10">

        <div className="w-full max-w-2xl space-y-6">

          {isLoading ? (

            <div className="space-y-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[420px] rounded-2xl"
                />
              ))}
            </div>

          ) : (feeds ?? []).length === 0 ? (

            <div className="text-center py-20 text-muted-foreground">
              <Rss
                size={40}
                className="mx-auto mb-3 opacity-30"
              />

              <p className="text-base">
                No news posts available yet.
              </p>

              <p className="text-sm mt-1">
                Check back later for updates.
              </p>
            </div>

          ) : (

            (feeds ?? []).map((feed) => (

              <Card
                key={feed.id}
                className="overflow-hidden rounded-2xl border shadow-sm bg-background"
              >

                {/* TOP HEADER */}

                <div className="flex items-center gap-3 px-4 py-3">

                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    E
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      ExamEdge
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(feed.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                </div>

                {/* IMAGE */}

                {feed.imageUrl && (

                  <div className="w-full bg-black">

                    <img
                      src={feed.imageUrl}
                      alt={feed.title}
                      className="w-full max-h-[500px] object-cover"
                      onError={(e) => {
                        (
                          e.target as HTMLImageElement
                        ).style.display = "none";
                      }}
                    />

                  </div>

                )}

                {/* CONTENT */}

                <CardContent className="pt-4 pb-5 space-y-3">

                  <h2 className="text-lg font-semibold leading-snug">
                    {feed.title}
                  </h2>

                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {feed.description}
                  </p>

                  {/* ACTIONS */}

                  <div className="flex items-center justify-between pt-3 border-t">

                    {/* LIKE */}

                    <button
                      onClick={async () => {

                        try {

                          await fetch(
                            `/api/feeds/${feed.id}/like`,
                            {
                              method: "POST",
                              credentials: "include",
                            }
                          );

                          qc.invalidateQueries({
                            queryKey: getListFeedsQueryKey(params),
                          });

                        } catch (err) {
                          console.error(err);
                        }

                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition"
                    >

                      <Heart size={18} />

                      <span>
                        {(feed as any).likes ?? 0}
                      </span>

                    </button>

                    {/* COMMENT */}

                    <button
                      onClick={() => {
                        alert("Comments feature coming soon");
                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
                    >

                      <MessageCircle size={18} />

                      <span>
                        {(feed as any).comments ?? 0}
                      </span>

                    </button>

                    {/* SHARE */}

                    <button
                      onClick={async () => {

                        try {

                          await fetch(
                            `/api/feeds/${feed.id}/share`,
                            {
                              method: "POST",
                              credentials: "include",
                            }
                          );

                          await navigator.clipboard.writeText(
                            `${window.location.origin}/feeds`
                          );

                          qc.invalidateQueries({
                            queryKey: getListFeedsQueryKey(params),
                          });

                          alert("Post link copied!");

                        } catch (err) {
                          console.error(err);
                        }

                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-600 transition"
                    >

                      <Share2 size={18} />

                      <span>
                        {(feed as any).shares ?? 0}
                      </span>

                    </button>

                  </div>

                </CardContent>

              </Card>

            ))

          )}

        </div>

      </div>

    </Layout>
  );
}