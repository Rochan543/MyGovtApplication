import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BookOpen, LayoutDashboard, FileText, Zap, BookMarked, PenTool,
  LogOut, User, ChevronRight, Menu, X, Rss
} from "lucide-react";
import { useState } from "react";

const studentNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Exams", href: "/exams", icon: BookOpen },
  { label: "Quizzes", href: "/quizzes", icon: Zap },
  { label: "Topic Mocks", href: "/topic-mocks", icon: PenTool },
  { label: "Papers", href: "/papers", icon: FileText },
  { label: "My Results", href: "/results", icon: BookMarked },
  { label: "News Feed", href: "/feeds", icon: Rss },
];

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Exams", href: "/admin/exams", icon: BookOpen },
  { label: "Questions", href: "/admin/questions", icon: PenTool },
  { label: "Topic Mocks", href: "/admin/topic-mocks", icon: Zap },
  { label: "Quizzes", href: "/admin/quizzes", icon: Zap },
  { label: "Subjects", href: "/admin/subjects", icon: BookMarked },
  { label: "Sections", href: "/admin/sections", icon: FileText },
  { label: "Papers", href: "/admin/papers", icon: FileText },
  { label: "Feed Panel", href: "/admin/feeds", icon: Rss },
  { label: "Users", href: "/admin/users", icon: User },
  { label: "Analytics", href: "/admin/analytics", icon: LayoutDashboard },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const nav = user?.role === "ADMIN" ? adminNav : studentNav;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-56" : "w-14"} flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border">
          <button
            data-testid="button-toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          {sidebarOpen && (
            <span className="ml-2 font-bold text-base tracking-tight text-white">ExamEdge</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = location === href || (href !== "/admin" && href !== "/dashboard" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 px-3 py-2 mx-2 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
                {sidebarOpen && active && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate text-sidebar-foreground">{user?.name}</div>
                <div className="text-xs text-sidebar-foreground/50 truncate">{user?.role}</div>
              </div>
              <button
                data-testid="button-logout"
                onClick={logout}
                className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              data-testid="button-logout-icon"
              onClick={logout}
              className="w-full flex justify-center p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
