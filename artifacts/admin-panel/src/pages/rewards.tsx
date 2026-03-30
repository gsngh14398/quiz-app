import { useState, useEffect } from "react";
import { useGetRewards, useCreateReward, useDeleteReward } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Coins, Zap, Settings, X } from "lucide-react";
import { format } from "date-fns";

export default function Rewards() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: rewards = [], isLoading } = useGetRewards({ request: { headers } });
  
  const createMut = useCreateReward({ request: { headers } });
  const deleteMut = useDeleteReward({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", pointsRequired: 1000, rewardType: "paytm", active: true });

  // Spin Prizes Config
  const [spinPrizes, setSpinPrizes] = useState<{ type: string; amount: number }[]>([]);
  const [spinLoading, setSpinLoading] = useState(true);
  const [spinSaving, setSpinSaving] = useState(false);
  const [newPrize, setNewPrize] = useState(10);

  useEffect(() => {
    fetch("/api/spin/prizes")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSpinPrizes(data); })
      .catch(() => {})
      .finally(() => setSpinLoading(false));
  }, []);

  const handleSaveSpinPrizes = async () => {
    if (spinPrizes.length === 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "You must have at least one spin prize." });
      return;
    }
    setSpinSaving(true);
    try {
      const res = await fetch("/api/spin/prizes", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(spinPrizes),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Saved", description: "Spin prizes updated successfully." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save spin prizes." });
    } finally {
      setSpinSaving(false);
    }
  };

  const addPrize = () => {
    if (!newPrize || newPrize < 1) return;
    setSpinPrizes(prev => [...prev, { type: "points", amount: Number(newPrize) }]);
    setNewPrize(10);
  };

  const removePrize = (idx: number) => {
    setSpinPrizes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
          toast({ title: "Success", description: "Reward item created." });
          setIsOpen(false);
          setFormData({ name: "", description: "", pointsRequired: 1000, rewardType: "paytm", active: true });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this reward option permanently?")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
        toast({ title: "Deleted", description: "Reward removed." });
      }
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title="Reward Shop" description="Configure point redemption items">
        <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Reward
        </Button>
      </PageHeader>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Reward Info</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Points Cost</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : rewards.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No rewards found. Add one to show gifts in the mobile app.</TableCell></TableRow>
            ) : (
              rewards.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.description}</div>
                  </TableCell>
                  <TableCell><span className="px-2 py-1 bg-secondary rounded uppercase text-xs font-semibold">{r.rewardType}</span></TableCell>
                  <TableCell><div className="flex items-center gap-1.5 font-bold text-yellow-500"><Coins className="w-4 h-4"/>{r.pointsRequired}</div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Spin Wheel Prizes Config */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Spin Wheel Prizes</h3>
              <p className="text-sm text-muted-foreground">Set the point amounts users can win from the daily spin</p>
            </div>
          </div>
          <Button onClick={handleSaveSpinPrizes} disabled={spinSaving} className="bg-primary hover:bg-primary/90 text-white">
            {spinSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
            Save Prizes
          </Button>
        </div>

        {spinLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {spinPrizes.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-foreground">{p.amount} pts</span>
                  <button
                    onClick={() => removePrize(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {spinPrizes.length === 0 && (
                <p className="text-sm text-muted-foreground">No prizes configured. Add some below.</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border/50">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Add prize (pts):</label>
              <Input
                type="number"
                min={1}
                value={newPrize}
                onChange={e => setNewPrize(Number(e.target.value))}
                className="w-32 bg-background"
                onKeyDown={e => e.key === "Enter" && addPrize()}
              />
              <Button variant="outline" onClick={addPrize}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
              <span className="text-xs text-muted-foreground">The wheel uses all these amounts as prize slots.</span>
            </div>
          </>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Add Reward Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name / Title</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. ₹100 Paytm Cash" className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reward Type</label>
                <select required value={formData.rewardType} onChange={e => setFormData({...formData, rewardType: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="paytm">Paytm</option>
                  <option value="upi">UPI</option>
                  <option value="gift_card">Gift Card</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Points Cost</label>
                <Input type="number" value={formData.pointsRequired} onChange={e => setFormData({...formData, pointsRequired: parseInt(e.target.value)})} required className="bg-background" />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Create Reward"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
