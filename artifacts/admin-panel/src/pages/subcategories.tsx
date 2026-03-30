import { useState } from "react";
import { useGetSubcategories, useCreateSubcategory, useUpdateSubcategory, useDeleteSubcategory, useGetCategories } from "@workspace/api-client-react";
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

export default function Subcategories() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: categories = [] } = useGetCategories({ request: { headers } });
  const [filterCatId, setFilterCatId] = useState("");
  const { data: subcategories = [], isLoading } = useGetSubcategories(
    filterCatId ? { categoryId: filterCatId } : undefined, 
    { request: { headers } }
  );
  
  const createMut = useCreateSubcategory({ request: { headers } });
  const updateMut = useUpdateSubcategory({ request: { headers } });
  const deleteMut = useDeleteSubcategory({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", categoryId: "", icon: "📝", color: "#6366f1", active: true, sortOrder: 0 });

  const handleOpen = (sub?: any) => {
    if (sub) {
      setEditingId(sub.id);
      setFormData({ name: sub.name, categoryId: sub.categoryId, icon: sub.icon, color: sub.color, active: sub.active, sortOrder: sub.sortOrder });
    } else {
      setEditingId(null);
      setFormData({ name: "", categoryId: filterCatId || (categories[0]?.id || ""), icon: "📝", color: "#6366f1", active: true, sortOrder: 0 });
    }
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingId 
      ? updateMut.mutateAsync({ id: editingId, data: formData })
      : createMut.mutateAsync({ data: formData });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] });
      toast({ title: "Success", description: "Saved successfully." });
      setIsOpen(false);
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader title="Subcategories" description="Organize quizzes within categories">
        <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Subcategory
        </Button>
      </PageHeader>

      <div className="flex gap-4 items-center bg-card/50 p-4 rounded-xl border border-border/50">
        <span className="text-sm font-medium text-muted-foreground">Filter by Category:</span>
        <select 
          className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
          value={filterCatId}
          onChange={(e) => setFilterCatId(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : subcategories.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No subcategories found.</TableCell></TableRow>
            ) : (
              subcategories.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                  <TableCell><span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">{s.categoryName}</span></TableCell>
                  <TableCell>{s.icon}</TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    <Switch checked={s.active} onCheckedChange={(active) => updateMut.mutate({ id: s.id, data: { active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] }) })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if(confirm('Delete?')) deleteMut.mutate({ id: s.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/subcategories"] }) })
                    }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Subcategory</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Parent Category</label>
              <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="" disabled>Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value)})} className="bg-background" />
              </div>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
