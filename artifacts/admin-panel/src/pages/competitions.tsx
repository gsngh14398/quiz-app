import { useState } from "react";
import { useGetCompetitions, useCreateCompetition, useUpdateCompetition, useDeleteCompetition, useGetQuizzes } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, Calendar, Users, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function Competitions() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: quizzes = [] } = useGetQuizzes(undefined, { request: { headers } });
  const { data: competitions = [], isLoading } = useGetCompetitions({ request: { headers } });
  
  const createMut = useCreateCompetition({ request: { headers } });
  const updateMut = useUpdateCompetition({ request: { headers } });
  const deleteMut = useDeleteCompetition({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({ 
    title: "", description: "", quizId: "", prizePool: 1000, 
    startDate: today, endDate: nextWeek, maxParticipants: 100, active: true 
  });

  const handleOpen = (comp?: any) => {
    if (comp) {
      setEditingId(comp.id);
      setFormData({ 
        title: comp.title, description: comp.description || "", quizId: comp.quizId || "", 
        prizePool: comp.prizePool, 
        startDate: comp.startDate.split('T')[0], 
        endDate: comp.endDate.split('T')[0], 
        maxParticipants: comp.maxParticipants || 100, active: comp.active 
      });
    } else {
      setEditingId(null);
      setFormData({ 
        title: "", description: "", quizId: quizzes[0]?.id || "", prizePool: 1000, 
        startDate: today, endDate: nextWeek, maxParticipants: 100, active: true 
      });
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingId 
      ? updateMut.mutateAsync({ id: editingId, data: formData })
      : createMut.mutateAsync({ data: formData });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Success", description: "Competition saved." });
      setIsOpen(false);
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title="Competitions" description="Host timed tournaments and challenges">
        <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Host Competition
        </Button>
      </PageHeader>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Event Details</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Rewards & Caps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : competitions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No active competitions.</TableCell></TableRow>
            ) : (
              competitions.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <div className="font-medium text-foreground text-lg">{c.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[250px]">{c.description}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-green-500" /> {format(new Date(c.startDate), "MMM d, yyyy")}</div>
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-500" /> {format(new Date(c.endDate), "MMM d, yyyy")}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-yellow-500"><Trophy className="w-3.5 h-3.5" /> {c.prizePool} pts pool</div>
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5" /> Max: {c.maxParticipants || 'Unlimited'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.active} onCheckedChange={(active) => updateMut.mutate({ id: c.id, data: { active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/competitions"] }) })} />
                  </TableCell>
                  <TableCell className="text-right opacity-50 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(c)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if(confirm('Delete competition?')) deleteMut.mutate({ id: c.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/competitions"] }) })
                    }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "Host"} Competition</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked Quiz</label>
              <select required value={formData.quizId} onChange={e => setFormData({...formData, quizId: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="" disabled>Select Quiz...</option>
                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prize Pool (Points)</label>
                <Input type="number" value={formData.prizePool} onChange={e => setFormData({...formData, prizePool: parseInt(e.target.value)})} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Participants</label>
                <Input type="number" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: parseInt(e.target.value)})} className="bg-background" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={formData.active} onCheckedChange={active => setFormData({...formData, active})} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createMut.isPending || updateMut.isPending}>Save Competition</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
