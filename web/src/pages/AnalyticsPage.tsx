import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertTriangle, TrendingUp, Users } from "lucide-react";

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.dashboard.analytics().then(setData).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Insights and trends across your organization</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top Recurring Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.top_recurring_issues ?? []).map((issue: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium">{issue.name}</p>
                    <p className="text-sm text-muted-foreground">{issue.occurrences} occurrences</p>
                  </div>
                  <Badge>{issue.total_votes} votes</Badge>
                </div>
              ))}
              {(!data?.top_recurring_issues || data.top_recurring_issues.length === 0) && (
                <p className="text-sm text-muted-foreground">No recurring issues detected</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.low_participation_teams ?? []).map((team: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium">{team.team_name}</p>
                    <p className="text-sm text-muted-foreground">{team.retro_count} retros</p>
                  </div>
                  <Badge variant={team.avg_contributors < 3 ? "destructive" : "secondary"}>
                    {team.avg_contributors?.toFixed(1) ?? 0} avg contributors
                  </Badge>
                </div>
              ))}
              {(!data?.low_participation_teams || data.low_participation_teams.length === 0) && (
                <p className="text-sm text-muted-foreground">No participation data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.monthly_trend ?? []).map((month: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <span className="font-medium">{month.month}</span>
                  <div className="flex gap-4 text-sm">
                    <span>{month.retro_count} retros</span>
                    <span>{month.action_count} actions</span>
                    <Badge variant="success">{month.completed_count} done</Badge>
                  </div>
                </div>
              ))}
              {(!data?.monthly_trend || data.monthly_trend.length === 0) && (
                <p className="text-sm text-muted-foreground">No trend data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Unresolved Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(data?.unresolved_actions ?? []).map((action: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.retro_title} - {action.team_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        action.priority === "critical"
                          ? "destructive"
                          : action.priority === "high"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {action.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!data?.unresolved_actions || data.unresolved_actions.length === 0) && (
                <p className="text-sm text-muted-foreground">All actions resolved!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
