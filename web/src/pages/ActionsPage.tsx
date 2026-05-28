import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ActionItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare } from "lucide-react";

export function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    api.actions.list().then((a: any) => setActions(a)).catch(console.error);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.actions.update(id, { status });
    load();
  };

  const filtered = statusFilter === "all" ? actions : actions.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Action Items</h1>
          <p className="text-muted-foreground">Track and manage action items across all retrospectives</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((action) => (
          <Card key={action.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Select value={action.status} onValueChange={(v) => handleStatusChange(action.id, v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <p className={`font-medium ${action.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {action.title}
                  </p>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    {action.retro_title && <span>{action.retro_title}</span>}
                    {action.team_name && <span>{action.team_name}</span>}
                    {action.owner_name && <span>Owner: {action.owner_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    action.priority === "critical"
                      ? "destructive"
                      : action.priority === "high"
                      ? "warning"
                      : action.priority === "medium"
                      ? "default"
                      : "secondary"
                  }
                >
                  {action.priority}
                </Badge>
                {action.due_date && <span className="text-sm text-muted-foreground">{action.due_date}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No action items found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
