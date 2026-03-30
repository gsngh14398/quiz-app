import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Upload, Plus, Edit, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, Database, FileJson, FileSpreadsheet,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API = "/api";
type Difficulty = "easy" | "medium" | "hard";
const DIFF_COLORS: Record<Difficulty, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};
const LABELS = ["A", "B", "C", "D"];
const PAGE_SIZE = 20;

interface Category { id: string; name: string; }
interface Subcategory { id: string; name: string; categoryId: string; }
interface Question {
  id: string; question: string; options: string[]; correctAnswer: number;
  explanation?: string; difficulty: Difficulty; quizId?: string;
  categoryId?: string; subcategoryId?: string;
}

function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const header = lines[0].toLowerCase();
  const isHeader = header.includes('question') || header.includes('optiona') || header.includes('option a');
  const dataLines = isHeader ? lines.slice(1) : lines;
  const letterToIdx: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  return dataLines.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const correctLetter = (cols[5] || 'A').toLowerCase().trim();
    const correctAnswer = letterToIdx[correctLetter] ?? 0;
    return {
      question: cols[0] || '',
      options: [cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || ''],
      correctAnswer,
      explanation: cols[6] || '',
      difficulty: 'medium' as Difficulty,
    };
  }).filter(q => q.question.trim() && q.options[0].trim());
}

export default function QuestionBank() {
  const { headers } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [subcatFilter, setSubcatFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [bankOnly, setBankOnly] = useState(false);
  const [page, setPage] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState("");
  const [mappedSubcat, setMappedSubcat] = useState("");
  const [mappedCat, setMappedCat] = useState("");
  const [uploadDiff, setUploadDiff] = useState<Difficulty>("medium");
  const [uploading, setUploading] = useState(false);

  const [editQ, setEditQ] = useState<Question | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', difficulty: 'medium' as Difficulty });

  const apiFetch = (url: string, opts?: RequestInit) =>
    fetch(url, { ...opts, headers: { ...headers, "Content-Type": "application/json", ...(opts?.headers ?? {}) } });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["bank-categories"],
    queryFn: () => apiFetch(`${API}/categories?active=false`).then(r => r.json()),
  });
  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["bank-subcategories"],
    queryFn: () => apiFetch(`${API}/subcategories`).then(r => r.json()),
  });

  const params = new URLSearchParams({
    ...(search && { search }),
    ...(catFilter && { categoryId: catFilter }),
    ...(subcatFilter && { subcategoryId: subcatFilter }),
    ...(diffFilter && { difficulty: diffFilter }),
    ...(bankOnly && { bankOnly: "true" }),
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
  });

  const { data, isLoading, refetch } = useQuery<{ questions: Question[]; total: number }>({
    queryKey: ["bank-questions", search, catFilter, subcatFilter, diffFilter, bankOnly, page],
    queryFn: () => apiFetch(`${API}/questions/bank?${params}`).then(r => r.json()),
  });

  const questions = data?.questions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteQMut = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/questions/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-questions"] }); toast({ title: "Question deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete question" }),
  });

  const updateQMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`${API}/questions/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-questions"] }); toast({ title: "Question updated" }); setEditOpen(false); },
    onError: () => toast({ variant: "destructive", title: "Failed to update question" }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        if (ext === 'json') {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
          setUploadData(arr);
        } else {
          setUploadData(parseCSV(text));
        }
        setUploadOpen(true);
      } catch {
        toast({ variant: "destructive", title: "Failed to parse file. Check the format." });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUploadSubmit = async () => {
    if (uploadData.length === 0) return;
    setUploading(true);
    try {
      const toSend = uploadData.map(q => ({
        ...q,
        difficulty: q.difficulty || uploadDiff,
        categoryId: q.categoryId || mappedCat || undefined,
        subcategoryId: q.subcategoryId || mappedSubcat || undefined,
        quizId: null,
      }));
      const res = await apiFetch(`${API}/questions/bulk`, { method: "POST", body: JSON.stringify(toSend) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast({ title: `Uploaded ${result.created} questions to the Question Bank` });
      qc.invalidateQueries({ queryKey: ["bank-questions"] });
      setUploadOpen(false);
      setUploadData([]);
      setUploadFileName("");
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (q: Question) => {
    setEditQ(q);
    setEditForm({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation || '', difficulty: q.difficulty });
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQ) return;
    updateQMut.mutate({ id: editQ.id, data: { ...editForm, categoryId: editQ.categoryId, subcategoryId: editQ.subcategoryId } });
  };

  const filteredSubcats = subcategories.filter(s => !catFilter || s.categoryId === catFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Question Bank" description="Central repository of all questions — reusable across quizzes">
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".json,.csv,.txt" onChange={handleFileSelect} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="border-border">
            <Upload className="h-4 w-4 mr-2" /> Bulk Upload
          </Button>
        </div>
      </PageHeader>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 border border-border/50 rounded-xl px-4 py-2.5">
        <Database className="h-4 w-4 text-primary/70" />
        <span><span className="font-semibold text-foreground">{total}</span> questions total</span>
        {bankOnly && <Badge className="text-xs bg-primary/15 text-primary border-primary/30 border ml-1">Bank Only (no quiz)</Badge>}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search questions..." className="bg-card border-border pl-9 max-w-xs" />
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setSubcatFilter(""); setPage(0); }}
          className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subcatFilter} onChange={e => { setSubcatFilter(e.target.value); setPage(0); }}
          className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Subcategories</option>
          {filteredSubcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={diffFilter} onChange={e => { setDiffFilter(e.target.value); setPage(0); }}
          className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-1">
          <input type="checkbox" checked={bankOnly} onChange={e => { setBankOnly(e.target.checked); setPage(0); }} className="rounded" />
          Bank only (no quiz assigned)
        </label>
      </div>

      {/* Questions list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg">No questions found</p>
          <p className="text-sm mt-1">Use Bulk Upload to add questions or create them via the Quizzes page</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="mt-4 border-border">
            <Upload className="h-4 w-4 mr-2" /> Upload Questions
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                      {page * PAGE_SIZE + idx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground flex-1">{q.question}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge className={`text-xs border ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                      {q.quizId
                        ? <Badge className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">In quiz</Badge>
                        : <Badge className="text-xs bg-primary/15 text-primary border border-primary/30">Bank only</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-8">
                    {q.options.map((opt, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${i === q.correctAnswer ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-border/60 text-muted-foreground"}`}>
                        {i === q.correctAnswer
                          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          : <span className="w-3.5 text-center shrink-0 font-medium">{LABELS[i]}</span>}
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>
                  {q.explanation && <p className="text-xs text-muted-foreground ml-8 mt-2 italic">💡 {q.explanation}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)} className="border-border h-8 w-8 p-0" title="Edit">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this question?")) deleteQMut.mutate(q.id); }}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 w-8 p-0" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="border-border">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center text-sm px-3">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="border-border">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD DIALOG ─────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {uploadFileName.endsWith('.json') ? <FileJson className="h-5 w-5 text-primary" /> : <FileSpreadsheet className="h-5 w-5 text-primary" />}
              Bulk Upload: {uploadFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-primary mb-1">
                {uploadData.length} questions detected
              </p>
              <p className="text-xs text-muted-foreground">
                CSV format: <code className="bg-muted px-1 rounded">question, optA, optB, optC, optD, correctLetter, explanation</code><br/>
                Correct answer column should be A, B, C, or D (letter).
              </p>
            </div>

            {uploadData.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">Preview (first 3 questions)</div>
                <div className="p-4 space-y-3">
                  {uploadData.slice(0, 3).map((q, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium text-foreground truncate">{i + 1}. {q.question}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Correct: {LABELS[q.correctAnswer]} — {q.options?.[q.correctAnswer]}
                      </p>
                    </div>
                  ))}
                  {uploadData.length > 3 && <p className="text-xs text-muted-foreground">+ {uploadData.length - 3} more...</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assign Category (optional)</label>
                <select value={mappedCat} onChange={e => { setMappedCat(e.target.value); setMappedSubcat(""); }}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assign Subcategory (optional)</label>
                <select value={mappedSubcat} onChange={e => setMappedSubcat(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">None</option>
                  {subcategories.filter(s => !mappedCat || s.categoryId === mappedCat).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Difficulty</label>
              <select value={uploadDiff} onChange={e => setUploadDiff(e.target.value as Difficulty)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadData([]); }} className="border-border">Cancel</Button>
              <Button onClick={handleUploadSubmit} disabled={uploading || uploadData.length === 0} className="bg-primary text-white">
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upload {uploadData.length} Questions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ─────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Question *</label>
              <textarea value={editForm.question} onChange={e => setEditForm(p => ({ ...p, question: e.target.value }))} required rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Options — click letter to mark correct answer</label>
              {editForm.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border ${editForm.correctAnswer === i ? "border-green-500/50 bg-green-500/5" : "border-border"}`}>
                  <button type="button" onClick={() => setEditForm(p => ({ ...p, correctAnswer: i }))}
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-colors ${editForm.correctAnswer === i ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/40 text-muted-foreground"}`}>
                    {LABELS[i]}
                  </button>
                  <input value={opt} onChange={e => { const o = [...editForm.options]; o[i] = e.target.value; setEditForm(p => ({ ...p, options: o })); }}
                    className="flex-1 bg-transparent text-sm focus:outline-none text-foreground" />
                  {editForm.correctAnswer === i && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select value={editForm.difficulty} onChange={e => setEditForm(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Explanation</label>
                <Input value={editForm.explanation} onChange={e => setEditForm(p => ({ ...p, explanation: e.target.value }))} className="bg-background border-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="border-border">Cancel</Button>
              <Button type="submit" disabled={updateQMut.isPending} className="bg-primary text-white">
                {updateQMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Question
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
