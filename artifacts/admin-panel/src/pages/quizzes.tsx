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
  Loader2, Plus, Edit, Trash2, Clock, Coins, Copy,
  ChevronRight, BookOpen, HelpCircle, CheckCircle2, ArrowLeft,
  Database, Search, ChevronLeft,
} from "lucide-react";

const API = "/api";
type Difficulty = "easy" | "medium" | "hard";
type ViewMode = "subcategories" | "quizzes" | "questions";

interface Category { id: string; name: string; color: string; }
interface Subcategory { id: string; name: string; categoryId: string; description?: string; categoryName?: string; }
interface Quiz {
  id: string; title: string; description?: string; subcategoryId: string;
  difficulty: Difficulty; timeLimit?: number; pointsPerQuestion: number;
  totalQuestions: number; active: boolean;
}
interface Question {
  id: string; question: string; options: string[]; correctAnswer: number;
  explanation?: string; difficulty: Difficulty; quizId?: string; categoryId?: string; subcategoryId?: string;
}

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};
const LABELS = ["A", "B", "C", "D"];

export default function Quizzes() {
  const { headers } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>("subcategories");
  const [selectedSubcat, setSelectedSubcat] = useState<Subcategory | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  const [quizOpen, setQuizOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: "", description: "", subcategoryId: "", difficulty: "medium" as Difficulty,
    timeLimit: 600, pointsPerQuestion: 10, active: true,
  });

  const [qOpen, setQOpen] = useState(false);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({
    question: "", options: ["", "", "", ""], correctAnswer: 0,
    explanation: "", difficulty: "medium" as Difficulty,
  });

  const [bankOpen, setBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankCat, setBankCat] = useState("");
  const [bankSubcat, setBankSubcat] = useState("");
  const [bankDiff, setBankDiff] = useState("");
  const [bankPage, setBankPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const BANK_PAGE_SIZE = 20;

  const apiFetch = (url: string, opts?: RequestInit) =>
    fetch(url, { ...opts, headers: { ...headers, "Content-Type": "application/json", ...(opts?.headers ?? {}) } });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["quiz-categories"],
    queryFn: () => apiFetch(`${API}/categories?active=false`).then(r => r.json()),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["quiz-subcategories"],
    queryFn: () => apiFetch(`${API}/subcategories`).then(r => r.json()),
  });

  const { data: allQuizzes = [], isLoading: quizzesLoading } = useQuery<Quiz[]>({
    queryKey: ["quiz-list", selectedSubcat?.id],
    queryFn: () => apiFetch(`${API}/quizzes${selectedSubcat ? `?subcategoryId=${selectedSubcat.id}` : ""}`).then(r => r.json()),
    enabled: view !== "subcategories",
  });

  const { data: quizQuestions = [], isLoading: qLoading } = useQuery<Question[]>({
    queryKey: ["quiz-questions", selectedQuiz?.id],
    queryFn: () => apiFetch(`${API}/quizzes/${selectedQuiz!.id}/questions`).then(r => r.json()),
    enabled: !!selectedQuiz && view === "questions",
  });

  const bankParams = new URLSearchParams({
    ...(bankSearch && { search: bankSearch }),
    ...(bankCat && { categoryId: bankCat }),
    ...(bankSubcat && { subcategoryId: bankSubcat }),
    ...(bankDiff && { difficulty: bankDiff }),
    limit: String(BANK_PAGE_SIZE),
    offset: String(bankPage * BANK_PAGE_SIZE),
  });

  const { data: bankData, isLoading: bankLoading } = useQuery<{ questions: Question[]; total: number }>({
    queryKey: ["bank-modal", bankSearch, bankCat, bankSubcat, bankDiff, bankPage],
    queryFn: () => apiFetch(`${API}/questions/bank?${bankParams}`).then(r => r.json()),
    enabled: bankOpen,
  });

  const bankQuestions = bankData?.questions ?? [];
  const bankTotal = bankData?.total ?? 0;
  const bankTotalPages = Math.ceil(bankTotal / BANK_PAGE_SIZE);

  const addFromBankMut = useMutation({
    mutationFn: (questionIds: string[]) =>
      apiFetch(`${API}/quizzes/${selectedQuiz!.id}/add-questions`, { method: "POST", body: JSON.stringify({ questionIds }) }).then(r => r.json()),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz?.id] });
      qc.invalidateQueries({ queryKey: ["quiz-list"] });
      toast({ title: `Added ${result.added} questions${result.skipped > 0 ? ` (${result.skipped} already existed)` : ""}` });
      setBankOpen(false);
      setSelectedIds(new Set());
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add questions" }),
  });

  const createQuizMut = useMutation({
    mutationFn: (data: any) => apiFetch(`${API}/quizzes`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quiz-list"] }); toast({ title: "Quiz created" }); setQuizOpen(false); },
    onError: () => toast({ variant: "destructive", title: "Failed to create quiz" }),
  });

  const updateQuizMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`${API}/quizzes/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["quiz-list"] });
      if (selectedQuiz?.id === updated.id) setSelectedQuiz({ ...selectedQuiz!, ...updated });
      toast({ title: "Quiz updated" });
      setQuizOpen(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update quiz" }),
  });

  const deleteQuizMut = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/quizzes/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quiz-list"] }); toast({ title: "Quiz deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete quiz" }),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/quizzes/${id}/duplicate`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quiz-list"] }); toast({ title: "Quiz duplicated as draft" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to duplicate quiz" }),
  });

  const createQMut = useMutation({
    mutationFn: (data: any) => apiFetch(`${API}/questions`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz?.id] });
      qc.invalidateQueries({ queryKey: ["quiz-list"] });
      toast({ title: "Question added" });
      setQOpen(false);
      resetQ();
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add question" }),
  });

  const updateQMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`${API}/questions/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz?.id] });
      toast({ title: "Question updated" });
      setQOpen(false);
      resetQ();
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update question" }),
  });

  const deleteQMut = useMutation({
    mutationFn: (id: string) => apiFetch(`${API}/questions/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quiz-questions", selectedQuiz?.id] });
      qc.invalidateQueries({ queryKey: ["quiz-list"] });
      toast({ title: "Question deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to delete question" }),
  });

  const resetQ = () => setQForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", difficulty: "medium" });

  const openQuizDialog = (q?: Quiz) => {
    if (q) {
      setEditQuiz(q);
      setQuizForm({ title: q.title, description: q.description || "", subcategoryId: q.subcategoryId, difficulty: q.difficulty, timeLimit: q.timeLimit || 600, pointsPerQuestion: q.pointsPerQuestion, active: q.active });
    } else {
      setEditQuiz(null);
      setQuizForm({ title: "", description: "", subcategoryId: selectedSubcat?.id || (subcategories[0]?.id || ""), difficulty: "medium", timeLimit: 600, pointsPerQuestion: 10, active: true });
    }
    setQuizOpen(true);
  };

  const openQDialog = (q?: Question) => {
    if (q) {
      setEditQ(q);
      setQForm({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, explanation: q.explanation || "", difficulty: q.difficulty });
    } else {
      setEditQ(null);
      resetQ();
    }
    setQOpen(true);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title.trim() || !quizForm.subcategoryId) return;
    if (editQuiz) updateQuizMut.mutate({ id: editQuiz.id, data: quizForm });
    else createQuizMut.mutate({ ...quizForm, totalQuestions: 0 });
  };

  const handleQSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm.question.trim()) { toast({ variant: "destructive", title: "Enter question text" }); return; }
    if (qForm.options.some(o => !o.trim())) { toast({ variant: "destructive", title: "Fill all 4 options" }); return; }
    const subcat = subcategories.find(s => s.id === selectedQuiz?.subcategoryId);
    const cat = subcat ? categories.find(c => c.id === subcat.categoryId) : undefined;
    const payload = { ...qForm, quizId: selectedQuiz?.id, subcategoryId: selectedQuiz?.subcategoryId, categoryId: cat?.id };
    if (editQ) updateQMut.mutate({ id: editQ.id, data: payload });
    else createQMut.mutate(payload);
  };

  const filteredSubcats = subcategories.filter(s =>
    (!catFilter || s.categoryId === catFilter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );
  const catOf = (s: Subcategory) => categories.find(c => c.id === s.categoryId);
  const visibleQuizzes = allQuizzes.filter(q =>
    q.subcategoryId === selectedSubcat?.id &&
    (!search || q.title.toLowerCase().includes(search.toLowerCase()))
  );

  const goBack = () => {
    if (view === "questions") { setView("quizzes"); setSelectedQuiz(null); setSearch(""); }
    else { setView("subcategories"); setSelectedSubcat(null); setSelectedQuiz(null); setSearch(""); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Quiz Management" description="Navigate: Subcategories → Quizzes → Questions" />

      {/* Breadcrumb nav */}
      {view !== "subcategories" && (
        <div className="flex items-center gap-2 text-sm bg-card/50 border border-border/50 rounded-xl px-4 py-2.5">
          <button onClick={() => { setView("subcategories"); setSelectedSubcat(null); setSelectedQuiz(null); setSearch(""); }}
            className="text-primary hover:underline font-medium">All Subcategories</button>
          {selectedSubcat && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button onClick={() => view === "questions" && (setView("quizzes"), setSelectedQuiz(null), setSearch(""))}
                className={view === "questions" ? "text-primary hover:underline font-medium" : "text-foreground font-semibold cursor-default"}>
                {selectedSubcat.name}
              </button>
            </>
          )}
          {selectedQuiz && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">{selectedQuiz.title}</span>
            </>
          )}
        </div>
      )}

      {/* ── SUBCATEGORIES ── */}
      {view === "subcategories" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Search subcategories..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card border-border max-w-xs" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubcats.map(subcat => {
              const cat = catOf(subcat);
              return (
                <button key={subcat.id} onClick={() => { setSelectedSubcat(subcat); setView("quizzes"); setSearch(""); }}
                  className="text-left p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg" style={{ background: (cat?.color ?? "#6366f1") + "22" }}>
                      <BookOpen className="h-5 w-5" style={{ color: cat?.color ?? "#6366f1" }} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-0.5">{subcat.name}</h3>
                  {cat && <p className="text-xs text-primary/70 mb-1">{cat.name}</p>}
                  {subcat.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{subcat.description}</p>}
                  <p className="text-xs text-muted-foreground">Click to manage quizzes →</p>
                </button>
              );
            })}
            {filteredSubcats.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No subcategories found</p>
                <p className="text-sm mt-1">Add subcategories from the Subcategories page first</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── QUIZZES ── */}
      {view === "quizzes" && selectedSubcat && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={goBack} className="border-border">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Input placeholder="Search quizzes..." value={search} onChange={e => setSearch(e.target.value)} className="bg-card border-border max-w-xs" />
            </div>
            <Button onClick={() => openQuizDialog()} className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Quiz
            </Button>
          </div>

          {quizzesLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleQuizzes.map(quiz => (
                <div key={quiz.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                        <Badge className={`text-xs border ${DIFF_COLORS[quiz.difficulty]}`}>{quiz.difficulty}</Badge>
                        {!quiz.active && <Badge className="text-xs border border-border bg-muted text-muted-foreground">Inactive</Badge>}
                      </div>
                      {quiz.description && <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>}
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary/60" />
                      <span className="font-medium text-foreground">{quiz.totalQuestions}</span> questions
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-yellow-500/60" />
                      <span className="font-medium text-foreground">{quiz.totalQuestions * quiz.pointsPerQuestion}</span> pts total
                    </div>
                    {!!quiz.timeLimit && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500/60" />
                        <span>{Math.floor(quiz.timeLimit / 60)}m</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setSelectedQuiz(quiz); setView("questions"); setSearch(""); }}
                      className="bg-primary/15 text-primary hover:bg-primary/25 border-0 flex-1 text-xs">
                      <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Manage Questions ({quiz.totalQuestions})
                    </Button>
                    <Button size="sm" variant="outline" title="Edit quiz" onClick={() => openQuizDialog(quiz)} className="border-border h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" title="Duplicate quiz" onClick={() => duplicateMut.mutate(quiz.id)} disabled={duplicateMut.isPending} className="border-border h-8 w-8 p-0">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" title="Delete quiz" onClick={() => {
                      if (confirm(`Delete "${quiz.title}" and all its questions?`)) deleteQuizMut.mutate(quiz.id);
                    }} className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {visibleQuizzes.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No quizzes yet</p>
                  <p className="text-sm mt-1">Click "Create Quiz" to add the first quiz to this subcategory</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── QUESTIONS ── */}
      {view === "questions" && selectedQuiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={goBack} className="border-border">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{selectedQuiz.title}</span>
                  <Badge className={`text-xs border ${DIFF_COLORS[selectedQuiz.difficulty]}`}>{selectedQuiz.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedQuiz.totalQuestions} questions · {selectedQuiz.totalQuestions * selectedQuiz.pointsPerQuestion} total pts · {selectedQuiz.pointsPerQuestion} pts/question
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setBankOpen(true); setSelectedIds(new Set()); setBankPage(0); setBankSearch(""); setBankCat(""); setBankSubcat(""); setBankDiff(""); }}
                className="border-border">
                <Database className="h-4 w-4 mr-2" /> Add from Bank
              </Button>
              <Button onClick={() => openQDialog()} className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Question
              </Button>
            </div>
          </div>

          {qLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {quizQuestions.map((q, idx) => (
                <div key={q.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-foreground">{q.question}</p>
                        <Badge className={`text-xs border ml-auto shrink-0 ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-8">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${i === q.correctAnswer ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-border/60 text-muted-foreground"}`}>
                            {i === q.correctAnswer
                              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                              : <span className="w-3.5 text-center shrink-0 font-medium">{LABELS[i]}</span>}
                            <span className="truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground ml-8 mt-2 italic">💡 {q.explanation}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openQDialog(q)} className="border-border h-8 w-8 p-0" title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        if (confirm("Delete this question?")) deleteQMut.mutate(q.id);
                      }} className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 w-8 p-0" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {quizQuestions.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No questions yet</p>
                  <p className="text-sm mt-1">Click "Add Question" to create questions for this quiz</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ FORM DIALOG ── */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">{editQuiz ? "Edit Quiz" : "Create New Quiz"}</DialogTitle></DialogHeader>
          <form onSubmit={handleQuizSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Basic Algebra" className="bg-background border-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." className="bg-background border-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subcategory *</label>
              <select value={quizForm.subcategoryId} onChange={e => setQuizForm(p => ({ ...p, subcategoryId: e.target.value }))} required
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select subcategory</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}{s.categoryName ? ` (${s.categoryName})` : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select value={quizForm.difficulty} onChange={e => setQuizForm(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Points per Question</label>
                <Input type="number" min={1} value={quizForm.pointsPerQuestion} onChange={e => setQuizForm(p => ({ ...p, pointsPerQuestion: Number(e.target.value) }))} className="bg-background border-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Time Limit (seconds, 0 = no limit)</label>
              <Input type="number" min={0} value={quizForm.timeLimit} onChange={e => setQuizForm(p => ({ ...p, timeLimit: Number(e.target.value) }))} className="bg-background border-input" />
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch checked={quizForm.active} onCheckedChange={v => setQuizForm(p => ({ ...p, active: v }))} />
              <label className="text-sm font-medium">Active (visible to users)</label>
            </div>
            <p className="text-xs text-muted-foreground">Total questions and points are auto-calculated as you add questions.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setQuizOpen(false)} className="border-border">Cancel</Button>
              <Button type="submit" disabled={createQuizMut.isPending || updateQuizMut.isPending} className="bg-primary text-white">
                {(createQuizMut.isPending || updateQuizMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editQuiz ? "Update Quiz" : "Create Quiz"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD FROM BANK DIALOG ── */}
      <Dialog open={bankOpen} onOpenChange={v => { setBankOpen(v); if (!v) setSelectedIds(new Set()); }}>
        <DialogContent className="bg-card border-border sm:max-w-[720px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Add from Question Bank
              {selectedIds.size > 0 && <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 border">{selectedIds.size} selected</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap mt-1">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={bankSearch} onChange={e => { setBankSearch(e.target.value); setBankPage(0); }} placeholder="Search questions..." className="bg-background border-input pl-9" />
            </div>
            <select value={bankCat} onChange={e => { setBankCat(e.target.value); setBankSubcat(""); setBankPage(0); }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={bankDiff} onChange={e => { setBankDiff(e.target.value); setBankPage(0); }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {bankLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <>
              {bankQuestions.length > 0 && (
                <div className="flex items-center justify-between px-1 mt-1">
                  <button type="button" onClick={() => {
                    const allIds = new Set(bankQuestions.map(q => q.id));
                    const allSelected = bankQuestions.every(q => selectedIds.has(q.id));
                    if (allSelected) {
                      const newSet = new Set(selectedIds);
                      bankQuestions.forEach(q => newSet.delete(q.id));
                      setSelectedIds(newSet);
                    } else {
                      setSelectedIds(prev => new Set([...prev, ...allIds]));
                    }
                  }} className="text-xs text-primary hover:underline">
                    {bankQuestions.every(q => selectedIds.has(q.id)) ? "Deselect all on page" : "Select all on page"}
                  </button>
                  <p className="text-xs text-muted-foreground">{bankTotal} questions total</p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[40vh] pr-1">
                {bankQuestions.map(q => {
                  const checked = selectedIds.has(q.id);
                  return (
                    <button type="button" key={q.id} onClick={() => {
                      const newSet = new Set(selectedIds);
                      if (checked) newSet.delete(q.id); else newSet.add(q.id);
                      setSelectedIds(newSet);
                    }} className={`w-full text-left p-3.5 rounded-xl border transition-colors ${checked ? "border-primary/50 bg-primary/10" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground line-clamp-2">{q.question}</p>
                            <Badge className={`text-xs border shrink-0 ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</Badge>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {q.options.slice(0, 4).map((opt, i) => (
                              <span key={i} className={i === q.correctAnswer ? "text-green-400 font-medium" : ""}>{LABELS[i]}: {opt.slice(0, 20)}{opt.length > 20 ? "…" : ""}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {bankQuestions.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No questions found</p>
                    <p className="text-xs mt-1">Try different filters or upload questions to the Question Bank</p>
                  </div>
                )}
              </div>
              {bankTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/50">
                  <Button variant="outline" size="sm" onClick={() => setBankPage(p => p - 1)} disabled={bankPage === 0} className="border-border h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{bankPage + 1} / {bankTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setBankPage(p => p + 1)} disabled={bankPage >= bankTotalPages - 1} className="border-border h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-border/50 mt-2 shrink-0">
            <Button variant="outline" onClick={() => { setBankOpen(false); setSelectedIds(new Set()); }} className="border-border">Cancel</Button>
            <Button onClick={() => addFromBankMut.mutate([...selectedIds])} disabled={selectedIds.size === 0 || addFromBankMut.isPending} className="bg-primary text-white">
              {addFromBankMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Question{selectedIds.size !== 1 ? "s" : ""} to Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QUESTION FORM DIALOG ── */}
      <Dialog open={qOpen} onOpenChange={v => { setQOpen(v); if (!v) resetQ(); }}>
        <DialogContent className="bg-card border-border sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg">{editQ ? "Edit Question" : "Add Question"}</DialogTitle></DialogHeader>
          <form onSubmit={handleQSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Question *</label>
              <textarea value={qForm.question} onChange={e => setQForm(p => ({ ...p, question: e.target.value }))} required rows={3}
                placeholder="Type your question here..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Options — click the letter to mark correct answer</label>
              {qForm.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${qForm.correctAnswer === i ? "border-green-500/50 bg-green-500/5" : "border-border"}`}>
                  <button type="button" onClick={() => setQForm(p => ({ ...p, correctAnswer: i }))}
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-colors ${qForm.correctAnswer === i ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/40 text-muted-foreground hover:border-primary"}`}>
                    {LABELS[i]}
                  </button>
                  <input value={opt} onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })); }}
                    placeholder={`Option ${LABELS[i]}`} className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground" />
                  {qForm.correctAnswer === i && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select value={qForm.difficulty} onChange={e => setQForm(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Explanation (optional)</label>
                <Input value={qForm.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} placeholder="Explain the answer..." className="bg-background border-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setQOpen(false); resetQ(); }} className="border-border">Cancel</Button>
              <Button type="submit" disabled={createQMut.isPending || updateQMut.isPending} className="bg-primary text-white">
                {(createQMut.isPending || updateQMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editQ ? "Update Question" : "Add Question"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
