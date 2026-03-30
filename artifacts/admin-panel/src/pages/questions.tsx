import { useState, useRef } from "react";
import { useGetQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useGetCategories, useGetSubcategories, useGetQuizzes } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, Upload, Download } from "lucide-react";

export default function Questions() {
  const { headers } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [filterCatId, setFilterCatId] = useState("");
  const [filterQuizId, setFilterQuizId] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: categories = [] } = useGetCategories({ request: { headers } });
  const { data: quizzes = [] } = useGetQuizzes(undefined, { request: { headers } });
  
  const { data: response, isLoading } = useGetQuestions(
    { 
      categoryId: filterCatId || undefined, 
      quizId: filterQuizId || undefined,
      limit, 
      offset: page * limit 
    }, 
    { request: { headers } }
  );
  
  const questions = response?.questions || [];
  
  const createMut = useCreateQuestion({ request: { headers } });
  const updateMut = useUpdateQuestion({ request: { headers } });
  const deleteMut = useDeleteQuestion({ request: { headers } });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    categoryId: "", subcategoryId: "", quizId: "",
    question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", difficulty: "medium", active: true 
  });

  // CSV Bulk Upload state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleCsv = () => {
    const sample = [
      "question,optionA,optionB,optionC,optionD,correctAnswer,categoryId,quizId,difficulty",
      `"What is the capital of India?","New Delhi","Mumbai","Kolkata","Chennai","A","REPLACE_WITH_CATEGORY_ID","","easy"`,
      `"2 + 2 = ?","3","4","5","6","B","REPLACE_WITH_CATEGORY_ID","","easy"`,
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sample_questions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvResult(null);

    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "CSV file is empty or has no data rows." });
      setCsvUploading(false);
      return;
    }

    const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    let success = 0;
    const errors: string[] = [];

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let cur = "", inQ = false;
      for (const ch of row) {
        if (ch === '"' && !inQ) { inQ = true; continue; }
        if (ch === '"' && inQ) { inQ = false; continue; }
        if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      result.push(cur.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const cols = parseRow(line);
        const [question, optionA, optionB, optionC, optionD, correctAnswer, categoryId, quizId, difficulty] = cols;
        if (!question || !categoryId) { errors.push(`Row ${i + 1}: question and categoryId are required`); continue; }
        const correctIdx = answerMap[correctAnswer];
        if (correctIdx === undefined) { errors.push(`Row ${i + 1}: correctAnswer must be A, B, C, or D`); continue; }
        const payload = {
          question, options: [optionA, optionB, optionC, optionD],
          correctAnswer: correctIdx, categoryId,
          quizId: quizId || undefined,
          difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
          active: true,
        };
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload),
        });
        if (res.ok) { success++; } else {
          const data = await res.json();
          errors.push(`Row ${i + 1}: ${data.error || "Failed"}`);
        }
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    setCsvResult({ success, failed: errors.length, errors });
    setCsvUploading(false);
    if (success > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({ title: "Upload Complete", description: `${success} questions added successfully.` });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpen = (q?: any) => {
    if (q) {
      setEditingId(q.id);
      setFormData({ 
        categoryId: q.categoryId, subcategoryId: q.subcategoryId || "", quizId: q.quizId || "",
        question: q.question, options: q.options, correctAnswer: q.correctAnswer, 
        explanation: q.explanation || "", difficulty: q.difficulty, active: q.active 
      });
    } else {
      setEditingId(null);
      setFormData({ 
        categoryId: filterCatId || (categories[0]?.id || ""), subcategoryId: "", quizId: filterQuizId || "",
        question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", difficulty: "medium", active: true 
      });
    }
    setIsOpen(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOpts = [...formData.options];
    newOpts[index] = value;
    setFormData({ ...formData, options: newOpts });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.options.some(o => !o.trim())) {
      toast({ variant: "destructive", title: "Validation Error", description: "All options must be filled." });
      return;
    }

    const payload = {
      ...formData,
      subcategoryId: formData.subcategoryId || undefined,
      quizId: formData.quizId || undefined,
    };

    const action = editingId 
      ? updateMut.mutateAsync({ id: editingId, data: payload })
      : createMut.mutateAsync({ data: payload });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({ title: "Success", description: "Question saved." });
      setIsOpen(false);
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
      <PageHeader title="Question Bank" description="Manage MCQs across all categories and quizzes">
        <Button variant="outline" onClick={() => setCsvOpen(true)} className="border-primary/50 text-primary hover:bg-primary/10">
          <Upload className="w-4 h-4 mr-2" /> Bulk Upload CSV
        </Button>
        <Button onClick={() => handleOpen()} className="bg-primary hover:bg-primary/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Question
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-4 items-center bg-card/50 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Category:</span>
          <select 
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
            value={filterCatId}
            onChange={(e) => { setFilterCatId(e.target.value); setPage(0); }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Quiz:</span>
          <select 
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
            value={filterQuizId}
            onChange={(e) => { setFilterQuizId(e.target.value); setPage(0); }}
          >
            <option value="">All Quizzes</option>
            {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50%]">Question</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : questions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No questions found.</TableCell></TableRow>
            ) : (
              questions.map((q) => (
                <TableRow key={q.id} className="group">
                  <TableCell>
                    <div className="font-medium text-foreground line-clamp-2">{q.question}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span className="text-green-400">Ans: Option {String.fromCharCode(65 + q.correctAnswer)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      {q.quizId ? <span className="bg-primary/10 text-primary px-2 py-0.5 rounded w-fit truncate max-w-[150px]">Quiz ID: {q.quizId.slice(0,8)}...</span> : <span className="text-yellow-500/80">Unassigned (Pool)</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs uppercase font-semibold text-muted-foreground">{q.difficulty}</span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={q.active} onCheckedChange={(active) => updateMut.mutate({ id: q.id, data: { active } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/questions"] }) })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(q)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if(confirm('Delete?')) deleteMut.mutate({ id: q.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/questions"] }) })
                    }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination Simple */}
        <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/20">
          <span className="text-sm text-muted-foreground">Total: {response?.total || 0}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p=>p-1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(page+1)*limit >= (response?.total || 0)} onClick={() => setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Text</label>
              <textarea 
                value={formData.question} 
                onChange={e => setFormData({...formData, question: e.target.value})} 
                required 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="space-y-4 col-span-2 md:col-span-1">
                <label className="text-sm font-medium">Options</label>
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${formData.correctAnswer === i ? 'bg-green-500 text-white' : 'bg-secondary text-muted-foreground border border-border'}`}
                      onClick={() => setFormData({...formData, correctAnswer: i})}
                      title="Click to mark as correct answer"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <Input 
                      value={opt} 
                      onChange={e => handleOptionChange(i, e.target.value)} 
                      placeholder={`Option ${i+1}`}
                      className={`bg-background ${formData.correctAnswer === i ? 'border-green-500/50' : ''}`}
                    />
                  </div>
                ))}
              </div>
              
              <div className="space-y-4 col-span-2 md:col-span-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation (Optional)</label>
                  <textarea 
                    value={formData.explanation} 
                    onChange={e => setFormData({...formData, explanation: e.target.value})} 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Why is this the correct answer?"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category (Required)</label>
                <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="" disabled>Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quiz Assignment (Optional)</label>
                <select value={formData.quizId} onChange={e => setFormData({...formData, quizId: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Unassigned (Pool)</option>
                  {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <label className="text-sm font-medium">Active Status</label>
              <Switch checked={formData.active} onCheckedChange={active => setFormData({...formData, active})} />
            </div>
            
            <Button type="submit" className="w-full mt-4" disabled={createMut.isPending || updateMut.isPending}>Save Question</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Upload Dialog */}
      <Dialog open={csvOpen} onOpenChange={(o) => { setCsvOpen(o); if (!o) setCsvResult(null); }}>
        <DialogContent className="bg-card border-border sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Bulk Upload Questions via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">CSV Format (columns in order):</p>
              <code className="text-xs text-muted-foreground block">
                question, optionA, optionB, optionC, optionD, correctAnswer (A/B/C/D), categoryId, quizId (optional), difficulty (easy/medium/hard)
              </code>
              <Button variant="outline" size="sm" onClick={downloadSampleCsv} className="mt-2">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Sample CSV
              </Button>
            </div>

            {csvResult && (
              <div className={`border rounded-xl p-4 space-y-2 ${csvResult.failed === 0 ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                <p className="text-sm font-semibold">
                  Upload complete: <span className="text-green-400">{csvResult.success} added</span>
                  {csvResult.failed > 0 && <>, <span className="text-red-400">{csvResult.failed} failed</span></>}
                </p>
                {csvResult.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-red-400">{err}</p>
                ))}
                {csvResult.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground">...and {csvResult.errors.length - 5} more errors</p>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={csvUploading}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12"
              >
                {csvUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Choose CSV File & Upload</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Questions are uploaded one by one. This may take a moment for large files.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
