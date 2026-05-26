import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetAttempt, getGetAttemptQueryKey,
  useUpdateAttempt, useSubmitAttempt, useReportViolation
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight, Flag, Clock, Send, Maximize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Answer = { questionId: number; selectedOption: string | null; markedForReview: boolean };

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export default function ExamEnginePage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = parseInt(attemptId, 10);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [started, setStarted] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const { data: attempt, isLoading } = useGetAttempt(id, {
    query: { enabled: !!id, queryKey: getGetAttemptQueryKey(id) },
  });

  const updateAttempt = useUpdateAttempt();
  const submitAttempt = useSubmitAttempt({
    mutation: {
      onSuccess: (result) => setLocation(`/results/${result.attemptId}`),
    },
  });
  const reportViolation = useReportViolation();

  const questions = (attempt as unknown as { questions?: { id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string }[] })?.questions ?? [];

  // Init answers and timer
  useEffect(() => {
    if (!attempt) return;
    const savedAnswers = (attempt.answers as Answer[]) ?? [];
    const init: Answer[] = questions.map((q) => {
      const saved = savedAnswers.find((a) => a.questionId === q.id);
      return saved ?? { questionId: q.id, selectedOption: null, markedForReview: false };
    });
    setAnswers(init);
    setTimeRemaining(attempt.timeRemaining ?? (attempt as unknown as { duration: number }).duration * 60);
  }, [attempt?.id]);

  // Countdown
  useEffect(() => {
    if (!started || timeRemaining === null) return;
    if (timeRemaining <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((t) => (t !== null ? t - 1 : t));
    }, 1000);
    return () => clearInterval(timer);
  }, [started, timeRemaining]);

  // Auto-save every 30s
  useEffect(() => {
    if (!started) return;
    autoSaveRef.current = setInterval(() => {
      updateAttempt.mutate({
        id,
        data: { answers, timeRemaining: timeRemaining ?? 0, currentSection: 0 },
      });
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [started, answers, timeRemaining]);

  // Fullscreen
  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  // Fullscreen exit / tab switch detection
  useEffect(() => {
    if (!started) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setViolationCount((c) => {
          const next = c + 1;
          if (next >= 2) {
            reportViolation.mutate({ data: { attemptId: id, violationType: "TAB_SWITCH", autoSubmit: true } });
            toast({ title: "Auto-submitted", description: "Too many tab switches detected.", variant: "destructive" });
            submitAttempt.mutate({ id });
          } else {
            setShowViolationWarning(true);
          }
          return next;
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViolationCount((c) => {
          const next = c + 1;
          if (next >= 2) {
            reportViolation.mutate({ data: { attemptId: id, violationType: "FULLSCREEN_EXIT", autoSubmit: true } });
            submitAttempt.mutate({ id });
          } else {
            setShowViolationWarning(true);
            toast({ title: "Warning", description: "Please stay in fullscreen during the exam.", variant: "destructive" });
          }
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [started, id]);

const handleAutoSubmit = async () => {
  await updateAttempt.mutateAsync({
    id,
    data: {
      answers,
      timeRemaining: 0,
      currentSection: 0,
    },
  });

  submitAttempt.mutate({ id });
};

  const handleSelectOption = (option: string) => {
    const q = questions[currentIdx];
    if (!q) return;
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === q.id
          ? { ...a, selectedOption: a.selectedOption === option ? null : option }
          : a
      )
    );
  };

  const handleMarkReview = () => {
    const q = questions[currentIdx];
    if (!q) return;
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === q.id ? { ...a, markedForReview: !a.markedForReview } : a
      )
    );
  };

const handleSubmit = async () => {
  await updateAttempt.mutateAsync({
    id,
    data: {
      answers,
      timeRemaining: timeRemaining ?? 0,
      currentSection: 0,
    },
  });

  setShowSubmitDialog(false);

  submitAttempt.mutate({ id });
};

  const getQuestionStatus = (qId: number): "answered" | "marked" | "visited" | "not-visited" => {
    const a = answers.find((x) => x.questionId === qId);
    if (!a) return "not-visited";
    if (a.markedForReview) return "marked";
    if (a.selectedOption) return "answered";
    return "visited";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {!started ? (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">{(attempt as unknown as { examTitle?: string })?.examTitle ?? "Exam"}</h2>
            <p className="text-muted-foreground text-sm">
              {questions.length === 0
                ? "No questions have been added to this exam yet."
                : `${questions.length} questions · ${(attempt as unknown as { duration?: number })?.duration ?? 0} minutes`}
            </p>
            <Button onClick={() => { setStarted(true); requestFullscreen(); }}>
              Begin Exam <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Clock size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{(attempt as unknown as { examTitle?: string })?.examTitle ?? "Exam"}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {questions.length} questions · {formatTime(timeRemaining ?? 0)}
            </p>
          </div>
          <div className="text-sm text-muted-foreground space-y-1 text-left bg-muted/50 rounded p-4">
            <p>• Do not switch tabs or exit fullscreen</p>
            <p>• Exam auto-submits when time runs out</p>
            <p>• Two violations will auto-submit the exam</p>
          </div>
          <Button
            data-testid="button-begin-exam"
            className="w-full"
            onClick={() => { setStarted(true); requestFullscreen(); }}
          >
            <Maximize size={14} className="mr-2" /> Begin in Fullscreen
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.id);
  const answeredCount = answers.filter((a) => a.selectedOption).length;
  const markedCount = answers.filter((a) => a.markedForReview).length;

  const statusColors: Record<string, string> = {
    answered: "bg-green-500 text-white",
    marked: "bg-orange-400 text-white",
    visited: "bg-muted text-muted-foreground",
    "not-visited": "bg-muted/50 text-muted-foreground border border-border",
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="min-h-12 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{(attempt as unknown as { examTitle?: string })?.examTitle ?? "Exam"}</span>
          <Badge variant="secondary" className="text-xs">
            Q {currentIdx + 1}/{questions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div
            data-testid="text-timer"
            className={`font-mono text-sm font-bold ${timeRemaining !== null && timeRemaining < 300 ? "text-destructive" : "text-foreground"}`}
          >
            <Clock size={12} className="inline mr-1" />
            {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
          </div>
          <Button
            data-testid="button-submit-exam"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowSubmitDialog(true)}
          >
            <Send size={11} className="mr-1" /> Submit
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Question area */}
       <div className="flex-1 flex flex-col overflow-auto p-3 sm:p-4 lg:p-6">
          {currentQuestion ? (
            <>
              <div className="mb-6">
                <p className="text-sm font-medium leading-relaxed">{currentQuestion.questionText}</p>
              </div>
              <div className="space-y-3">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const key = `option${opt}` as "optionA" | "optionB" | "optionC" | "optionD";
                  const text = currentQuestion[key];
                  const selected = currentAnswer?.selectedOption === opt;
                  return (
                    <button
                      key={opt}
                      data-testid={`button-option-${opt}`}
                      className={`w-full text-left p-3 rounded border text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectOption(opt)}
                    >
                      <span className="font-mono text-xs mr-3 opacity-60">{opt}.</span>
                      {text}
                    </button>
                  );
                })}
              </div>

              {/* Nav buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mt-8">
                <Button
                  data-testid="button-prev"
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                >
                  <ChevronLeft size={14} className="mr-1" /> Prev
                </Button>
                <Button
                  data-testid="button-mark-review"
                  variant="outline"
                  size="sm"
                  className={currentAnswer?.markedForReview ? "border-orange-400 text-orange-500" : ""}
                  onClick={handleMarkReview}
                >
                  <Flag size={12} className="mr-1" />
                  {currentAnswer?.markedForReview ? "Unmark" : "Mark for Review"}
                </Button>
                <Button
                  data-testid="button-next"
                  size="sm"
                  disabled={currentIdx === questions.length - 1}
                  onClick={() => setCurrentIdx((i) => i + 1)}
                >
                  Save & Next <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </>
          ) : null}
        </div>

        {/* Question palette */}
       <aside className="w-full lg:w-56 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col flex-shrink-0 overflow-auto max-h-56 lg:max-h-full">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Question Palette</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {[
                { label: "Answered", color: "bg-green-500", count: answeredCount },
                { label: "Marked", color: "bg-orange-400", count: markedCount },
                { label: "Skipped", color: "bg-muted", count: answers.filter((a) => !a.selectedOption && !a.markedForReview).length },
              ].map(({ label, color, count }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-muted-foreground">{label}: {count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 overflow-auto">
            {questions.map((q, idx) => {
              const status = getQuestionStatus(q.id);
              return (
                <button
                  key={q.id}
                  data-testid={`button-palette-${idx + 1}`}
                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${statusColors[status]} ${
                    idx === currentIdx ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                  onClick={() => setCurrentIdx(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Submit dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              {questions.length - answeredCount > 0 && (
                <span className="text-destructive"> {questions.length - answeredCount} questions are unanswered.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button data-testid="button-cancel-submit" variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button data-testid="button-confirm-submit" onClick={handleSubmit} disabled={submitAttempt.isPending}>
              {submitAttempt.isPending ? "Submitting..." : "Yes, submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Violation warning */}
      <Dialog open={showViolationWarning} onOpenChange={setShowViolationWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle size={18} /> Violation Warning
            </DialogTitle>
            <DialogDescription>
              A tab switch or fullscreen exit was detected. This is warning {violationCount}/2.
              A second violation will auto-submit your exam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              data-testid="button-acknowledge-violation"
              onClick={() => { setShowViolationWarning(false); requestFullscreen(); }}
            >
              I understand, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
