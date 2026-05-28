import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckSquare, AlertCircle, TrendingUp } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [recentRetros, setRecentRetros] = useState<any[]>([]);

  useEffect(() => {
    api.dashboard.org().then(setData).catch(console.error);
    api.teams.list().then(setTeams).catch(console.error);
    api.retros.list().then((r: any) => setRecentRetros(r.slice(0, 5))).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Here's what's happening with your retrospectives</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retros</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total_retros ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.open_actions ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.completion_rate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Retrospectives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRetros.map((r: any) => (
                <Link
                  key={r.id}
                  to={`/retros/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.team_name}</p>
                  </div>
                  <Badge
                    variant={
                      r.status === "completed"
                        ? "secondary"
                        : r.status === "open"
                        ? "default"
                        : r.status === "discussion"
                        ? "warning"
                        : "outline"
                    }
                  >
                    {r.status}
                  </Badge>
                </Link>
              ))}
              {recentRetros.length === 0 && (
                <p className="text-sm text-muted-foreground">No retrospectives yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.top_themes ?? []).slice(0, 5).map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.team_name}</p>
                  </div>
                  <Badge>{t.vote_count} votes</Badge>
                </div>
              ))}
              {(!data?.top_themes || data.top_themes.length === 0) && (
                <p className="text-sm text-muted-foreground">No themes yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
