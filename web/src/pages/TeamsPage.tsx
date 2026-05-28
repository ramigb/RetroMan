import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Team, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, UserPlus, UserMinus } from "lucide-react";

export function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [membersDialog, setMembersDialog] = useState<{ open: boolean; teamId?: string }>({ open: false });
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = () => {
    api.teams.list().then((t: any) => setTeams(t)).catch(console.error);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.org_id) return;
    await api.teams.create({ name, product_area: area, org_id: user.org_id });
    setOpen(false);
    setName("");
    setArea("");
    loadTeams();
  };

  const openMembersDialog = async (team: Team) => {
    setSelectedTeam(team);
    const [members, users] = await Promise.all([
      api.teams.members(team.id),
      api.users.list(),
    ]);
    setTeamMembers(members);
    setAllUsers(users);
    setMembersDialog({ open: true, teamId: team.id });
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    const currentIds = teamMembers.map((m) => m.id);
    await api.teams.update(selectedTeam.id, { member_ids: [...currentIds, userId] });
    const members = await api.teams.members(selectedTeam.id);
    setTeamMembers(members);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    const currentIds = teamMembers.map((m) => m.id).filter((id) => id !== userId);
    await api.teams.update(selectedTeam.id, { member_ids: currentIds });
    const members = await api.teams.members(selectedTeam.id);
    setTeamMembers(members);
  };

  const availableUsers = allUsers.filter((u) => !teamMembers.some((m) => m.id === u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage your product teams</p>
        </div>
        {(user?.role === "admin" || user?.role === "facilitator") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Product Area</Label>
                  <Input value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {team.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.product_area && (
                <p className="text-sm text-muted-foreground">{team.product_area}</p>
              )}
              {team.team_lead_name && (
                <p className="text-sm">
                  Lead: <span className="font-medium">{team.team_lead_name}</span>
                </p>
              )}
              {(user?.role === "admin" || user?.role === "facilitator") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openMembersDialog(team)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No teams yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={membersDialog.open} onOpenChange={(open) => setMembersDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Members - {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Current Members ({teamMembers.length})</h3>
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{member.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No members yet</p>
              )}
            </div>

            {availableUsers.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Add Members ({availableUsers.length} available)</h3>
                <div className="space-y-2">
                  {availableUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{u.role}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddMember(u.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
