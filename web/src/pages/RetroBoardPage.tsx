import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRetroSocket } from "@/lib/websocket";
import { Retrospective, FeedbackItem, Theme, ActionItem, Vote, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  ArrowRight,
  ThumbsUp,
  CheckSquare,
  GripVertical,
  Trash2,
  Sparkles,
  Users,
  Circle,
  Edit,
} from "lucide-react";

const DEFAULT_CATEGORIES = ["Went Well", "Problems", "Ideas", "Risks", "Kudos"];
const CATEGORY_COLORS: Record<string, string> = {
  "Went Well": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Problems": "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
  "Ideas": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Risks": "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  "Kudos": "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  "Start": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Stop": "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
  "Continue": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Mad": "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
  "Sad": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Glad": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Liked": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Learned": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Lacked": "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  "Longed For": "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  "Wind": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Anchors": "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
  "Rocks": "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  "Sun": "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700";
}

export function RetroBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [retro, setRetro] = useState<Retrospective | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feedback");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [inlineNote, setInlineNote] = useState("");
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState("");
  const [actionDialog, setActionDialog] = useState<{ open: boolean; themeId?: string }>({ open: false });
  const [actionTitle, setActionTitle] = useState("");
  const [actionPriority, setActionPriority] = useState("medium");
  const [actionDueDate, setActionDueDate] = useState("");
  const [discussionText, setDiscussionText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"category" | "theme" | null>(null);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingThemeName, setEditingThemeName] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const retroData = (await api.retros.get(id)) as Retrospective;
      setRetro(retroData);
      setFeedback(retroData.feedback || []);
      setThemes(retroData.themes || []);
      setActions(retroData.actions || []);
      const userVotes = (await api.votes.list(id)) as Vote[];
      setVotes(userVotes);
      
      const members = (await api.teams.members(retroData.team_id)) as User[];
      setTeamMembers(members);
      
      const onlineData = await api.retros.onlineUsers(id);
      setOnlineUserIds(new Set(onlineData.userIds));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!retro) return;
    const phaseToTab: Record<string, string> = {
      draft: "feedback",
      open: "feedback",
      grouping: "themes",
      voting: "voting",
      discussion: "discussion",
      completed: "actions",
    };
    setActiveTab(phaseToTab[retro.status] || "feedback");
  }, [retro?.status]);

  const categories = retro?.template_categories 
    ? JSON.parse(retro.template_categories as string)
    : DEFAULT_CATEGORIES;

  const { send } = useRetroSocket(id, user?.id, (msg) => {
    if (msg.type === "update") loadData();
    if (msg.type === "users" && msg.userIds) {
      setOnlineUserIds(new Set(msg.userIds));
    }
  });

  const notifyUpdate = () => send({ type: "update", payload: {} });

  const handleAddNoteToCategory = async (category: string) => {
    if (!inlineNote.trim() || !id) return;
    await api.feedback.create({
      text: inlineNote,
      category,
      is_anonymous: isAnonymous,
      retro_id: id,
    });
    setInlineNote("");
    setAddingToCategory(null);
    notifyUpdate();
    loadData();
  };

  const handleDropOnCategory = async (category: string) => {
    if (!draggedItem || dragSource !== "category") return;
    await api.feedback.update(draggedItem, { category });
    setDraggedItem(null);
    setDragSource(null);
    setDragOverCategory(null);
    notifyUpdate();
    loadData();
  };

  const handleDeleteNote = async (noteId: string) => {
    await api.feedback.delete(noteId);
    notifyUpdate();
    loadData();
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim() || !id) return;
    await api.themes.create({ name: newThemeName, retro_id: id });
    setNewThemeName("");
    notifyUpdate();
    loadData();
  };

  const handleDropOnTheme = async (themeId: string) => {
    if (!draggedItem) return;
    await api.feedback.update(draggedItem, { theme_id: themeId });
    setDraggedItem(null);
    setDragSource(null);
    notifyUpdate();
    loadData();
  };

  const handleUnassignTheme = async (noteId: string) => {
    await api.feedback.update(noteId, { theme_id: null });
    notifyUpdate();
    loadData();
  };

  const handleVote = async (themeId: string) => {
    if (!id || !retro) return;
    const hasVoted = votes.some((v) => v.theme_id === themeId);
    if (hasVoted) {
      await api.votes.delete(themeId);
    } else {
      await api.votes.create(themeId, retro.id);
    }
    notifyUpdate();
    loadData();
  };

  const handleAdvance = async () => {
    if (!id) return;
    await api.retros.advance(id);
    notifyUpdate();
    loadData();
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim() || !id) return;
    await api.actions.create({
      title: actionTitle,
      priority: actionPriority,
      due_date: actionDueDate || undefined,
      theme_id: actionDialog.themeId,
      retro_id: id,
    });
    setActionDialog({ open: false });
    setActionTitle("");
    setActionPriority("medium");
    setActionDueDate("");
    notifyUpdate();
    loadData();
  };

  const handleAddDiscussionNote = async () => {
    if (!discussionText.trim() || !selectedTheme || !id) return;
    await api.discussion.create({
      text: discussionText,
      theme_id: selectedTheme.id,
      retro_id: id,
    });
    setDiscussionText("");
    notifyUpdate();
    const themeData = (await api.themes.get(selectedTheme.id)) as Theme;
    setSelectedTheme(themeData);
  };

  const handleAutoCluster = async () => {
    if (!id) return;
    const result = await api.ai.autoCluster(id);
    if (result.clusters) {
      for (const cluster of result.clusters) {
        const theme = (await api.themes.create({ name: cluster.suggested_name, retro_id: id })) as Theme;
        for (const itemId of cluster.item_ids) {
          await api.feedback.update(itemId, { theme_id: theme.id });
        }
      }
    }
    notifyUpdate();
    loadData();
  };

  const handleDeleteTheme = async (themeId: string) => {
    await api.themes.delete(themeId);
    notifyUpdate();
    loadData();
  };

  const handleRenameTheme = async (themeId: string) => {
    if (!editingThemeName.trim()) {
      setEditingThemeId(null);
      return;
    }
    await api.themes.update(themeId, { name: editingThemeName.trim() });
    setEditingThemeId(null);
    setEditingThemeName("");
    notifyUpdate();
    loadData();
  };

  const handleUpdateAction = async (actionId: string, status: string) => {
    await api.actions.update(actionId, { status });
    notifyUpdate();
    loadData();
  };

  const handleGenerateSummary = async () => {
    if (!id) return;
    const result = await api.ai.summarize(id);
    setSummary(result);
    setSummaryOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!retro) {
    return <div className="text-center py-12">Retrospective not found</div>;
  }

  const isFacilitator = user?.role === "admin" || user?.role === "facilitator";
  const unassignedNotes = feedback.filter((f) => !f.theme_id);
  const votesRemaining = (retro.max_votes_per_user || 3) - votes.length;

  const statusSteps = ["draft", "open", "grouping", "voting", "discussion", "completed"];
  const currentStepIndex = statusSteps.indexOf(retro.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{retro.title}</h1>
            <Badge
              variant={
                retro.status === "completed"
                  ? "secondary"
                  : retro.status === "open"
                  ? "default"
                  : retro.status === "grouping"
                  ? "secondary"
                  : retro.status === "voting"
                  ? "warning"
                  : retro.status === "discussion"
                  ? "warning"
                  : "outline"
              }
            >
              {retro.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {retro.team_name} {retro.sprint_cycle_name && `- ${retro.sprint_cycle_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {retro.status === "completed" && (
            <Button variant="outline" onClick={handleGenerateSummary}>
              <Sparkles className="h-4 w-4 mr-1" /> AI Summary
            </Button>
          )}
          {isFacilitator && retro.status !== "completed" && (
            <Button onClick={handleAdvance}>
              Advance to {statusSteps[currentStepIndex + 1] || "next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {statusSteps.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                i <= currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {i < statusSteps.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feedback" className="relative">
            Feedback ({feedback.length})
            {retro.status === "open" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="themes" className="relative">
            Grouping ({themes.length})
            {retro.status === "grouping" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="voting" className="relative">
            Voting
            {retro.status === "voting" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="discussion" className="relative">
            Discussion
            {retro.status === "discussion" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="actions">
            Actions ({actions.length})
          </TabsTrigger>
          <TabsTrigger value="members">
            Members ({teamMembers.length})
          </TabsTrigger>
        </TabsList>

        {retro.status !== "draft" && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Current Phase:</span>
              <Badge variant="default" className="capitalize">{retro.status}</Badge>
              <span className="text-muted-foreground">
                {retro.status === "open" && "- Team members can add feedback"}
                {retro.status === "grouping" && "- Facilitator groups related feedback into themes"}
                {retro.status === "voting" && "- Team votes on themes to prioritize discussion"}
                {retro.status === "discussion" && "- Discuss top-voted themes and create action items"}
                {retro.status === "completed" && "- Retro is complete, review action items"}
              </span>
            </div>
          </div>
        )}

        <TabsContent value="feedback" className="space-y-4">
          {retro.status === "open" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              Post anonymously
            </label>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {categories.map((cat: string) => {
              const catNotes = feedback.filter((f) => f.category === cat && !f.theme_id);
              const isAdding = addingToCategory === cat;
              const isDragOver = dragOverCategory === cat;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {cat}
                      <Badge variant="outline">{catNotes.length}</Badge>
                    </h3>
                    {retro.status === "open" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          if (isAdding) {
                            setAddingToCategory(null);
                            setInlineNote("");
                          } else {
                            setAddingToCategory(cat);
                          }
                        }}
                      >
                        <Plus className={`h-4 w-4 transition-transform ${isAdding ? "rotate-45" : ""}`} />
                      </Button>
                    )}
                  </div>
                  <div
                    className={`space-y-2 min-h-[100px] p-2 rounded-lg transition-colors ${
                      isDragOver
                        ? "bg-primary/10 ring-2 ring-primary"
                        : "bg-muted/50"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragSource === "category") setDragOverCategory(cat);
                    }}
                    onDragLeave={() => setDragOverCategory(null)}
                    onDrop={() => handleDropOnCategory(cat)}
                  >
                    {isAdding && (
                      <div className={`p-3 rounded-lg border ${getCategoryColor(cat)} shadow-sm`}>
                        <textarea
                          autoFocus
                          placeholder={`Add to ${cat}...`}
                          value={inlineNote}
                          onChange={(e) => setInlineNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddNoteToCategory(cat);
                            }
                            if (e.key === "Escape") {
                              setAddingToCategory(null);
                              setInlineNote("");
                            }
                          }}
                          className="w-full bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground min-h-[60px]"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setAddingToCategory(null);
                              setInlineNote("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!inlineNote.trim()}
                            onClick={() => handleAddNoteToCategory(cat)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
                    {catNotes.map((note) => (
                      <div
                        key={note.id}
                        draggable={retro.status === "open" || retro.status === "grouping" || retro.status === "discussion"}
                        onDragStart={() => {
                          setDraggedItem(note.id);
                          setDragSource("category");
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragSource(null);
                          setDragOverCategory(null);
                        }}
                        className={`p-3 rounded-lg border ${getCategoryColor(note.category)} cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow`}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{note.category}</span>
                        <p className="text-sm mt-0.5">{note.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {note.is_anonymous ? "Anonymous" : note.author_name}
                          </span>
                          {note.author_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="flex items-center gap-4">
            {isFacilitator && (retro.status === "grouping" || retro.status === "discussion") && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="New theme name..."
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={handleCreateTheme} disabled={!newThemeName.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Create Theme
                  </Button>
                </div>
                {unassignedNotes.length > 0 && (
                  <Button variant="outline" onClick={handleAutoCluster}>
                    <Sparkles className="h-4 w-4 mr-1" /> Auto-Cluster ({unassignedNotes.length} unassigned)
                  </Button>
                )}
              </>
            )}
          </div>

          {unassignedNotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unassigned Notes ({unassignedNotes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {unassignedNotes.map((note) => (
                    <div
                      key={note.id}
                      draggable={isFacilitator}
                      onDragStart={() => {
                        if (!isFacilitator) return;
                        setDraggedItem(note.id);
                        setDragSource("theme");
                      }}
                      className={`p-2 rounded-lg border ${getCategoryColor(note.category)} ${isFacilitator ? 'cursor-grab' : 'cursor-default'} text-sm max-w-xs`}
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{note.category}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isFacilitator && <GripVertical className="h-3 w-3 text-muted-foreground" />}
                        <span>{note.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => {
              const themeNotes = feedback.filter((f) => f.theme_id === theme.id);
              return (
                <Card
                  key={theme.id}
                  className="transition-shadow hover:shadow-md"
                  onDragOver={(e) => {
                    if (isFacilitator) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (isFacilitator) handleDropOnTheme(theme.id);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {editingThemeId === theme.id ? (
                        <Input
                          autoFocus
                          value={editingThemeName}
                          onChange={(e) => setEditingThemeName(e.target.value)}
                          onBlur={() => handleRenameTheme(theme.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameTheme(theme.id);
                            if (e.key === "Escape") {
                              setEditingThemeId(null);
                              setEditingThemeName("");
                            }
                          }}
                          className="h-7 text-base font-semibold"
                        />
                      ) : (
                        <CardTitle
                          className={`text-base ${isFacilitator ? "cursor-pointer hover:text-primary" : ""}`}
                          onDoubleClick={() => {
                            if (isFacilitator) {
                              setEditingThemeId(theme.id);
                              setEditingThemeName(theme.name);
                            }
                          }}
                          title={isFacilitator ? "Double-click to rename" : ""}
                        >
                          {theme.name}
                        </CardTitle>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{themeNotes.length} notes</Badge>
                        <Badge>{theme.vote_count} votes</Badge>
                        {isFacilitator && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingThemeId(theme.id);
                                setEditingThemeName(theme.name);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteTheme(theme.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {themeNotes.map((note) => (
                        <div
                          key={note.id}
                          draggable={isFacilitator}
                          onDragStart={() => {
                            if (!isFacilitator) return;
                            setDraggedItem(note.id);
                            setDragSource("theme");
                          }}
                          className={`p-2 rounded border ${getCategoryColor(note.category)} text-sm flex items-start justify-between ${isFacilitator ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{note.category}</span>
                            <p className="mt-0.5">{note.text}</p>
                          </div>
                          {isFacilitator && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => handleUnassignTheme(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="voting" className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-base px-4 py-2">
              Votes remaining: {votesRemaining} / {retro.max_votes_per_user}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...themes]
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((theme) => {
                const hasVoted = votes.some((v) => v.theme_id === theme.id);
                const themeNotes = feedback.filter((f) => f.theme_id === theme.id);
                return (
                  <Card key={theme.id} className={hasVoted ? "ring-2 ring-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{theme.name}</CardTitle>
                        <Badge variant={hasVoted ? "default" : "outline"}>{theme.vote_count}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {themeNotes.length} feedback items
                      </p>
                      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                        {themeNotes.map((n) => (
                          <p key={n.id} className="text-xs p-1 rounded bg-muted">
                            {n.text}
                          </p>
                        ))}
                      </div>
                      {retro.status === "voting" && (
                        <Button
                          variant={hasVoted ? "default" : "outline"}
                          className="w-full"
                          onClick={() => handleVote(theme.id)}
                          disabled={!hasVoted && votesRemaining <= 0}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {hasVoted ? "Voted" : "Vote"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="discussion" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-semibold">Themes (by votes)</h3>
              {[...themes]
                .sort((a, b) => b.vote_count - a.vote_count)
                .map((theme) => (
                  <div
                    key={theme.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTheme?.id === theme.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                    onClick={async () => {
                      const t = (await api.themes.get(theme.id)) as Theme;
                      setSelectedTheme(t);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{theme.name}</span>
                      <Badge>{theme.vote_count}</Badge>
                    </div>
                  </div>
                ))}
            </div>

            <div className="md:col-span-2">
              {selectedTheme ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedTheme.name}</CardTitle>
                      <Dialog
                        open={actionDialog.open}
                        onOpenChange={(open) => setActionDialog({ open, themeId: selectedTheme.id })}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <CheckSquare className="h-4 w-4 mr-1" /> Create Action
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Action Item</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreateAction} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={actionTitle}
                                onChange={(e) => setActionTitle(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Priority</Label>
                              <Select value={actionPriority} onValueChange={setActionPriority}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Due Date</Label>
                              <Input
                                type="date"
                                value={actionDueDate}
                                onChange={(e) => setActionDueDate(e.target.value)}
                              />
                            </div>
                            <Button type="submit" className="w-full">Create</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Feedback Items</h4>
                      <div className="space-y-1">
                        {(selectedTheme.feedback || []).map((f) => (
                          <div
                            key={f.id}
                            className={`p-2 rounded border ${getCategoryColor(f.category)} text-sm`}
                          >
                            {f.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-sm mb-2">Discussion Notes</h4>
                      <div className="space-y-2 mb-3">
                        {(selectedTheme.discussion_notes || []).map((note) => (
                          <div key={note.id} className="p-2 rounded bg-muted text-sm">
                            <span className="font-medium">{note.author_name}: </span>
                            {note.text}
                          </div>
                        ))}
                      </div>
                      {retro.status === "discussion" && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a discussion note..."
                            value={discussionText}
                            onChange={(e) => setDiscussionText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddDiscussionNote();
                            }}
                          />
                          <Button onClick={handleAddDiscussionNote} disabled={!discussionText.trim()}>
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    Select a theme to discuss
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Action Items</h3>
            {isFacilitator && (
              <Dialog
                open={actionDialog.open}
                onOpenChange={(open) => setActionDialog({ open })}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Action
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Action Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAction} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={actionTitle}
                        onChange={(e) => setActionTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={actionPriority} onValueChange={setActionPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={actionDueDate}
                        onChange={(e) => setActionDueDate(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="space-y-2">
            {actions.map((action) => (
              <Card key={action.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Select
                      value={action.status}
                      onValueChange={(v) => handleUpdateAction(action.id, v)}
                    >
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
                      <p
                        className={`font-medium ${
                          action.status === "done" ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {action.title}
                      </p>
                      {action.owner_name && (
                        <p className="text-sm text-muted-foreground">Owner: {action.owner_name}</p>
                      )}
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
                    {action.due_date && (
                      <span className="text-sm text-muted-foreground">{action.due_date}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {actions.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No action items yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Team Members</h3>
            <Badge variant="outline">
              {onlineUserIds.size} online
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => {
              const isOnline = onlineUserIds.has(member.id);
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-current ${
                          isOnline ? "text-green-500" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
            {teamMembers.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No team members</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Summary - {summary?.retro_title}</DialogTitle>
          </DialogHeader>
          {summary && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{summary.executive_summary}</p>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Top Themes</h4>
                <div className="space-y-1">
                  {summary.top_themes?.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm p-2 rounded bg-muted">
                      <span>{t.name}</span>
                      <span>{t.votes} votes, {t.items} items</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Action Items</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="p-2 rounded bg-muted">
                    <div className="font-bold">{summary.action_items?.total}</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="font-bold">{summary.action_items?.open}</div>
                    <div className="text-muted-foreground">Open</div>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="font-bold">{summary.action_items?.in_progress}</div>
                    <div className="text-muted-foreground">In Progress</div>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="font-bold">{summary.action_items?.done}</div>
                    <div className="text-muted-foreground">Done</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
