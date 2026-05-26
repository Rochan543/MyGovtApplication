import { useAuth } from "@/contexts/AuthContext";
import { Layout, PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <Layout>
      <PageHeader title="Profile" subtitle="Your account details" />

      <div className="p-6 max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-base">{user?.name}</CardTitle>
                <Badge data-testid="badge-role" variant={user?.role === "ADMIN" ? "default" : "secondary"} className="text-xs mt-1">
                  {user?.role}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded border border-border">
              <User size={15} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p data-testid="text-name" className="text-sm font-medium">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded border border-border">
              <Mail size={15} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p data-testid="text-email" className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded border border-border">
              <Shield size={15} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p data-testid="text-role" className="text-sm font-medium">{user?.role}</p>
              </div>
            </div>
            <Button
              data-testid="button-logout"
              variant="destructive"
              className="w-full"
              onClick={logout}
            >
              <LogOut size={14} className="mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
