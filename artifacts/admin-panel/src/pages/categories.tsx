import { useState } from "react";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function Categories() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: categories = [], isLoading } = useGetCategories({ request: { headers } });
  const createMut = useCreateCategory({ request: { headers } });
  const updateMut = useUpdateCategory({ request: { headers } });
  const deleteMut = useDeleteCategory({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "BookOpen", color: "#6366f1", active: true });

  const handleOpen = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({ name: cat.name, description: cat.description || "", icon: cat.icon, color: cat.color, active: cat.active });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "", icon: "BookOpen", color: "#6366f1", active: true });
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingId 
      ? updateMut.mutateAsync({ id: editingId, data: formData })
      : createMut.mutateAsync({ data: formData });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Success", description: `Category ${editingId ? 'updated' : 'created'}.` });
      setIsOpen(false);
    }).catch(() => {
      toast({ variant: "destructive", title: "Error", description: "Operation failed." });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        toast({ title: "Deleted", description: "Category removed." });
      }
    });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader title="Categories" description="Manage top-level quiz categories">
        <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </PageHeader>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No categories found.</TableCell></TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id} className="border-border/50 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell>{c.icon}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c.color }} />
                      <span className="text-xs text-muted-foreground">{c.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{c.questionCount}</TableCell>
                  <TableCell>
                    <Switch checked={c.active} onCheckedChange={(active) => updateMut.mutate({ id: c.id, data: { active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/categories"] }) })} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(c)} className="hover:text-primary"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon (Text/Emoji)</label>
                <Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color (Hex)</label>
                <div className="flex gap-2">
                  <Input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-12 p-1 h-10 bg-background cursor-pointer" />
                  <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="flex-1 bg-background" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={formData.active} onCheckedChange={active => setFormData({...formData, active})} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
