import { createContext, useContext, useEffect, useState } from "react";
import {
  useGetMe,
  getGetMeQueryKey,
  login,
  logout,
  register,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import type { User, LoginInput, RegisterInput, AuthResponse } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

setAuthTokenGetter(() => localStorage.getItem("accessToken"));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(true);

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: {
      enabled: !!localStorage.getItem("accessToken"),
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      setIsInitializing(false);
    } else if (!isUserLoading) {
      setIsInitializing(false);
    }
  }, [isUserLoading]);

  const handleAuthSuccess = (response: AuthResponse) => {
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    queryClient.setQueryData(getGetMeQueryKey(), response.user);
    if (response.user.role === "ADMIN") {
      setLocation("/admin");
    } else {
      setLocation("/dashboard");
    }
  };

  const loginFn = async (data: LoginInput) => {
    try {
      const response = await login(data);
      handleAuthSuccess(response);
      toast({ title: "Welcome back", description: "Successfully logged in." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const registerFn = async (data: RegisterInput) => {
    try {
      const response = await register(data);
      handleAuthSuccess(response);
      toast({ title: "Account created", description: "Welcome to ExamEdge!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const logoutFn = async () => {
    try {
      if (localStorage.getItem("accessToken")) await logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      queryClient.setQueryData(getGetMeQueryKey(), null);
      queryClient.clear();
      setLocation("/login");
      toast({ title: "Logged out" });
    }
  };

  const isLoading = isInitializing || isUserLoading;

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading, login: loginFn, register: registerFn, logout: logoutFn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
