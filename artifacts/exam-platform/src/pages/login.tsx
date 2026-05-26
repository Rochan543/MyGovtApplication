import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, user } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (user) return <Redirect to={user.role === "ADMIN" ? "/admin" : "/dashboard"} />;

  const onSubmit = async (data: FormData) => {
    setIsPending(true);
    try {
      await login(data);
    } catch {
      // toast handled in context
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ExamEdge</span>
        </div>
        <div>
          <blockquote className="text-3xl font-light text-white/80 leading-relaxed">
            "Success in competitive exams is not about luck — it's about systematic preparation."
          </blockquote>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[["50K+", "Students"], ["2K+", "Questions"], ["100+", "Exams"]].map(([num, label]) => (
              <div key={label} className="bg-white/5 rounded p-4 border border-white/10">
                <div className="text-2xl font-bold text-white">{num}</div>
                <div className="text-xs text-white/50 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">SSC · RRB · Banking · UPSC · State PSC</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">ExamEdge</span>
          </div>

          <h2 className="text-2xl font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-8">Enter your credentials to continue</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-email"
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-password"
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                data-testid="button-submit"
                type="submit"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>
          </Form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            No account?{" "}
            <Link href="/register" data-testid="link-register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
