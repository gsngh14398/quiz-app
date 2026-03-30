import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Edit, Trash2, FileText, Link2, ExternalLink,
  BookOpen, ChevronRight, Search,
} from "lucide-react";

const API = "/api";
interface Category { id: string; name: string; color: string; }
interface Subcategory { id: string; name: string; categoryId: string; }
interface Note {
  id: string; title: string; description?: string; content?: string;
  pdfUrl?: string; categoryId?: string; subcategoryId?: string;
  active: boolean; createdAt: string;
  categoryName?: string; subcategoryName?: string;
}

const blankForm = () => ({
  title: "", description: "", content: "", pdfUrl: "",
  categoryId: "", subcategoryId: "", active: true,
});

export default function Notes() {
  const { headers } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [catFilter, setCatFilter] = useState("");
  const [subcatFilter, setSubcatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());

  const apiFetch = async (url: string, opts?: RequestInit) => {
    const r = await fetch(url, { ...opts, headers: { ...headers, "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r;
  };

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["notes-cats"],
    queryFn: () => apiFetch(`${API}/categories?active=false`).then(r => r.json()),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["notes-subcats"],
    queryFn: () => apiFetch(`${API}/subcategories`).then(r => r.json()),
  });

  const params = new URLSearchParams({
    admin: "true",
    ...(catFilter && { categoryId: catFilter }),
    ...(subcatFilter && { subcategoryId: subcatFilter }),
    ...(search && { search }),
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["admin-notes", catFilter, subcatFilter, search],
    queryFn: () => apiFetch(`${API}/notes?${params}`).then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch(`${API}/notes`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notes"] }); toast({ title: "Note created" }); setOpen(false); },
    onError: () => toast({ variant: "destructive", title: "Failed to create note" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`${API}/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notes"] }); toast({ title: "Note updated" }); setOpen(false); },
    onError: () => toast({ variant: "destructive", title: "Failed to update note" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/notes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notes"] }); toast({ title: "Note deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete note" }),
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...blankForm(), categoryId: catFilter, subcategoryId: subcatFilter });
    setOpen(true);
  };

  const openEdit = (n: Note) => {
    setEditId(n.id);
    setForm({
      title: n.title, description: n.description || "", content: n.content || "",
      pdfUrl: n.pdfUrl || "", categoryId: n.categoryId || "",
      subcategoryId: n.subcategoryId || "", active: n.active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      description: form.description || undefined,
      content: form.content || undefined,
      pdfUrl: form.pdfUrl || undefined,
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      active: form.active,
    };
    if (editId) updateMut.mutate({ id: editId, data: payload });
    else createMut.mutate(payload);
  };

  const filteredSubcats = subcategories.filter(s => !form.categoryId || s.categoryId === form.categoryId);
  const filterSubcats = subcategories.filter(s => !catFilter || s.categoryId === catFilter);

  const isGoogleDriveLink = (url: string) =>
    url.includes("drive.google.com") || url.includes("docs.google.com");

  const getPreviewUrl = (url: string) => {
    if (!url) return "";
    if (isGoogleDriveLink(url)) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
      if (url.includes("/edit")) return url.replace("/edit", "/preview");
    }
    return url;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Study Notes" description="Manage PDF notes organized by Subject and Subcategory">
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Note
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center bg-card/50 border border-border/50 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="bg-card border-border pl-9 max-w-xs" />
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setSubcatFilter(""); }}
          className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Subjects</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subcatFilter} onChange={e => setSubcatFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Subcategories</option>
          {filterSubcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground ml-auto">{notes.length} notes</span>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No notes found</p>
          <p className="text-sm mt-1">Click "Add Note" to create the first study note</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {notes.map(n => (
            <div key={n.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${n.pdfUrl ? "bg-red-500/15" : "bg-primary/15"}`}>
                  {n.pdfUrl ? <Link2 className="h-4 w-4 text-red-400" /> : <FileText className="h-4 w-4 text-primary/70" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm text-foreground truncate">{n.title}</h3>
                    {!n.active && <Badge className="text-xs border border-border bg-muted text-muted-foreground">Inactive</Badge>}
                    {n.pdfUrl && <Badge className="text-xs border border-red-500/30 bg-red-500/10 text-red-400">PDF</Badge>}
                  </div>
                  {n.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{n.description}</p>}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    {n.categoryName && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {n.categoryName}
                      </span>
                    )}
                    {n.subcategoryName && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        <span>{n.subcategoryName}</span>
                      </>
                    )}
                  </div>
                  {n.pdfUrl && (
                    <a href={n.pdfUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                      <ExternalLink className="h-3 w-3" /> Open PDF
                    </a>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Switch className="scale-75" checked={n.active} onCheckedChange={active =>
                    updateMut.mutate({ id: n.id, data: { active } })
                  } />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(n)} className="h-8 w-8 p-0">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm(`Delete "${n.title}"?`) && deleteMut.mutate(n.id)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editId ? "Edit Note" : "Add Study Note"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Chapter 1 - Introduction" className="bg-background border-input" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Short Description</label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the note..." className="bg-background border-input" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value, subcategoryId: "" }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">No subject</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subcategory</label>
                <select value={form.subcategoryId} onChange={e => setForm(p => ({ ...p, subcategoryId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">No subcategory</option>
                  {filteredSubcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-primary/70" />
                PDF Link (Google Drive, direct URL, etc.)
              </label>
              <Input value={form.pdfUrl} onChange={e => setForm(p => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://drive.google.com/file/d/..." className="bg-background border-input" />
              <p className="text-xs text-muted-foreground">Paste a Google Drive share link or any direct PDF URL. The app will open it automatically.</p>
            </div>

            {form.pdfUrl && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs font-medium text-primary mb-1">Preview URL</p>
                <a href={getPreviewUrl(form.pdfUrl)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary break-all flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {getPreviewUrl(form.pdfUrl)}
                </a>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Additional Notes (optional text)</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3}
                placeholder="Any additional text content..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
              <label className="text-sm font-medium">Active (visible to users)</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border">Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="bg-primary text-white">
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editId ? "Update Note" : "Create Note"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
