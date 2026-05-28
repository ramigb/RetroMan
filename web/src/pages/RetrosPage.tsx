import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Retrospective, Team, RetroTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ClipboardList } from "lucide-react";

export function RetrosPage() {
  const { user } = useAuth();
  const [retros, setRetros] = useState<Retrospective[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<RetroTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    api.retros.list().then((r: any) => setRetros(r)).catch(console.error);
    api.teams.list().then((t: any) => setTeams(t)).catch(console.error);
    api.templates.list().then((t: any) => setTemplates(t)).catch(console.error);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.retros.create({
      title,
      sprint_cycle_name: sprintName,
      team_id: teamId,
      template_id: templateId || undefined,
    });
    setOpen(false);
    setTitle("");
    setSprintName("");
    setTeamId("");
    setTemplateId("");
    load();
  };

  const statusColors: Record<string, any> = {
    draft: "outline",
    open: "default",
    grouping: "secondary",
    voting: "warning",
    discussion: "warning",
    completed: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Retrospectives</h1>
          <p className="text-muted-foreground">Manage and participate in team retrospectives</p>
        </div>
        {(user?.role === "admin" || user?.role === "facilitator") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Retrospective
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Retrospective</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Sprint/Cycle Name</Label>
                  <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select value={teamId} onValueChange={setTeamId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {retros.map((retro) => (
          <Link key={retro.id} to={`/retros/${retro.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{retro.title}</CardTitle>
                  <Badge variant={statusColors[retro.status]}>{retro.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{retro.team_name}</p>
                {retro.sprint_cycle_name && (
                  <p className="text-sm">{retro.sprint_cycle_name}</p>
                )}
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{retro.feedback_count ?? 0} notes</span>
                  <span>{retro.theme_count ?? 0} themes</span>
                  <span>{retro.open_actions ?? 0} actions</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {retros.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No retrospectives yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
