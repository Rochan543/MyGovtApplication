import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

// Public pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";

// Student pages
import DashboardPage from "@/pages/dashboard";
import ExamsPage from "@/pages/exams";
import ExamDetailPage from "@/pages/exam-detail";
import ExamEnginePage from "@/pages/exam-engine";
import ResultDetailPage from "@/pages/result-detail";
import ResultsPage from "@/pages/results";
import QuizzesPage from "@/pages/quizzes";
import TopicMocksPage from "@/pages/topic-mocks";
import PapersPage from "@/pages/papers";
import ProfilePage from "@/pages/profile";

// Admin pages
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminExamsPage from "@/pages/admin/exams";
import AdminQuestionsPage from "@/pages/admin/questions";
import AdminUsersPage from "@/pages/admin/users";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminSubjectsPage from "@/pages/admin/subjects";
import AdminSectionsPage from "@/pages/admin/sections";
import AdminTopicMocksPage from "@/pages/admin/topic-mocks";
import AdminQuizzesPage from "@/pages/admin/quizzes";
import AdminPapersPage from "@/pages/admin/papers";
import AdminFeedsPage from "@/pages/admin/feeds";
import FeedsPage from "@/pages/feeds";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={user.role === "ADMIN" ? "/admin" : "/dashboard"} />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Student */}
      <Route path="/dashboard">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/exams">
        <ProtectedRoute><ExamsPage /></ProtectedRoute>
      </Route>
      <Route path="/exams/:id">
        <ProtectedRoute><ExamDetailPage /></ProtectedRoute>
      </Route>
      <Route path="/exam-engine/:attemptId">
        <ProtectedRoute><ExamEnginePage /></ProtectedRoute>
      </Route>
      <Route path="/quiz-engine/:attemptId">
        <ProtectedRoute><ExamEnginePage /></ProtectedRoute>
      </Route>
      <Route path="/results/:attemptId">
        <ProtectedRoute><ResultDetailPage /></ProtectedRoute>
      </Route>
      <Route path="/results">
        <ProtectedRoute><ResultsPage /></ProtectedRoute>
      </Route>
      <Route path="/quizzes">
        <ProtectedRoute><QuizzesPage /></ProtectedRoute>
      </Route>
      <Route path="/topic-mocks">
        <ProtectedRoute><TopicMocksPage /></ProtectedRoute>
      </Route>
      <Route path="/papers">
        <ProtectedRoute><PapersPage /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      </Route>
      <Route path="/feeds">
        <ProtectedRoute><FeedsPage /></ProtectedRoute>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/exams">
        <ProtectedRoute adminOnly><AdminExamsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/questions">
        <ProtectedRoute adminOnly><AdminQuestionsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute adminOnly><AdminAnalyticsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/subjects">
        <ProtectedRoute adminOnly><AdminSubjectsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/sections">
        <ProtectedRoute adminOnly><AdminSectionsPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/topic-mocks">
        <ProtectedRoute adminOnly><AdminTopicMocksPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/quizzes">
        <ProtectedRoute adminOnly><AdminQuizzesPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/papers">
        <ProtectedRoute adminOnly><AdminPapersPage /></ProtectedRoute>
      </Route>
      <Route path="/admin/feeds">
        <ProtectedRoute adminOnly><AdminFeedsPage /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
