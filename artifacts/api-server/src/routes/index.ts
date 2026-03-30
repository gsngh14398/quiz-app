import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "quiz-elite-secret-2024";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin-quiz-elite-secret-2024";

// ── Middleware ────────────────────────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" }); return;
  }
}

function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string };
    (req as any).adminId = decoded.adminId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid admin token" }); return;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
router.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  try {
    const { email, name, password, referralCode, deviceId } = req.body;
    if (!email || !name || !password) { res.status(400).json({ error: "Missing required fields" }); return; }

    const existing = await storage.getUserByEmail(email);
    if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = nanoid(8).toUpperCase();

    const user = await storage.createUser({
      email, name, passwordHash,
      referralCode: myReferralCode,
      deviceId: deviceId || null,
      points: 50,
      isActive: true,
    } as any);

    if (referralCode) {
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (referrer && referrer.id !== user.id) {
        await storage.createReferral(referrer.id, user.id);
        await storage.addPoints(referrer.id, 100, "referral", `Referral bonus for inviting ${name}`);
        await storage.addPoints(user.id, 50, "referral", "Referral signup bonus");
      }
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Missing fields" }); return; }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.passwordHash) { res.status(401).json({ error: "Invalid credentials" }); return; }
    if (!user.isActive) { res.status(403).json({ error: "Account disabled" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

    await storage.updateUser(user.id, { lastLogin: new Date() });

    const today = new Date().toISOString().split("T")[0];
    const { isNew } = await storage.updateStreak(user.id, today);
    if (isNew) {
      await storage.addPoints(user.id, 5, "daily_login", "Daily login bonus");
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, points: safeUser.points + (isNew ? 5 : 0) } });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await storage.getUser((req as any).userId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await storage.updateUser((req as any).userId, { name, phone, avatar });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Admin Auth ────────────────────────────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Missing fields" }); return; }

    let admin = await storage.getAdminByEmail(email);
    if (!admin) {
      if (email === "admin@quizelite.com" && password === "admin123") {
        const hash = await bcrypt.hash(password, 10);
        admin = await storage.createAdminUser({ email, passwordHash: hash, name: "Admin" });
      } else {
        res.status(401).json({ error: "Invalid credentials" }); return;
      }
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

    const token = jwt.sign({ adminId: admin.id }, ADMIN_JWT_SECRET, { expiresIn: "7d" });
    const { passwordHash: _, ...safeAdmin } = admin;
    res.json({ token, admin: safeAdmin });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/me", adminMiddleware, async (req, res) => {
  try {
    const admin = await storage.getAdminById((req as any).adminId);
    res.json(admin);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/stats", adminMiddleware, async (_req, res) => {
  try {
    const stats = await storage.getAnalytics();
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get("/categories", async (_req, res) => {
  try {
    res.json(await storage.getCategories(false));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/categories", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createCategory(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/categories/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateCategory(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/categories/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteCategory(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Subcategories ─────────────────────────────────────────────────────────────
router.get("/subcategories", async (req, res) => {
  try {
    res.json(await storage.getSubcategories(req.query.categoryId as string));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/subcategories", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createSubcategory(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/subcategories/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateSubcategory(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/subcategories/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteSubcategory(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Quizzes ───────────────────────────────────────────────────────────────────
router.get("/quizzes", async (req, res) => {
  try {
    res.json(await storage.getQuizzes(req.query.subcategoryId as string));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/quizzes/:id", async (req, res) => {
  try {
    const quiz = await storage.getQuizById(req.params.id);
    if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
    res.json(quiz);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/quizzes/:quizId/questions", async (req, res) => {
  try {
    res.json(await storage.getQuestionsByQuizId(req.params.quizId));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/quizzes", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createQuiz(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/quizzes/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateQuiz(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/quizzes/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteQuiz(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/quizzes/:id/duplicate", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.duplicateQuiz(req.params.id));
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

router.post("/quizzes/:id/add-questions", adminMiddleware, async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) { res.status(400).json({ error: "No question IDs provided" }); return; }
    const result = await storage.addQuestionsToQuiz(req.params.id, questionIds);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// ── Questions ─────────────────────────────────────────────────────────────────
router.get("/questions", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.getAllQuestions({
      categoryId: req.query.categoryId as string,
      subcategoryId: req.query.subcategoryId as string,
      quizId: req.query.quizId as string,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/questions/bank", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.getAllQuestions({
      categoryId: req.query.categoryId as string,
      subcategoryId: req.query.subcategoryId as string,
      difficulty: req.query.difficulty as string,
      search: req.query.search as string,
      bankOnly: req.query.bankOnly === "true",
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/questions/bulk", adminMiddleware, async (req, res) => {
  try {
    const qs = Array.isArray(req.body) ? req.body : req.body.questions;
    if (!Array.isArray(qs) || qs.length === 0) { res.status(400).json({ error: "No questions provided" }); return; }
    const created = await storage.bulkCreateQuestions(qs);
    res.status(201).json({ created: created.length, questions: created });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

router.post("/questions", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createQuestion(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/questions/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateQuestion(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/questions/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteQuestion(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Quiz Submission ───────────────────────────────────────────────────────────
router.post("/quiz/submit", authMiddleware, async (req, res) => {
  try {
    const { categoryId, quizId, answers, timeTaken } = req.body;
    const userId = (req as any).userId;

    const qs = quizId ? await storage.getQuestionsByQuizId(quizId) : [];
    if (!qs.length) { res.status(400).json({ error: "No questions found" }); return; }

    const quiz = quizId ? await storage.getQuizById(quizId) : null;
    const pointsPerQ = quiz?.pointsPerQuestion ?? 10;

    let score = 0;
    const results = qs.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) score++;
      return { questionId: q.id, isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation ?? null };
    });

    const pointsEarned = score * pointsPerQ;
    if (pointsEarned > 0) {
      await storage.addPoints(userId, pointsEarned, "quiz_correct", `Scored ${score}/${qs.length} in quiz`);
    }

    await storage.createQuizResult({
      userId,
      categoryId: categoryId || (quiz as any)?.categoryId || "",
      quizId: quizId || null,
      score,
      totalQuestions: qs.length,
      timeTaken,
      pointsEarned,
    });

    res.json({ quizResult: { score, totalQuestions: qs.length, pointsEarned }, results, pointsEarned });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
  try {
    const period = (req.query.period as "daily" | "weekly" | "global") || "global";
    res.json(await storage.getLeaderboard(period));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Streak ────────────────────────────────────────────────────────────────────
router.get("/streak", authMiddleware, async (req, res) => {
  try {
    const streak = await storage.getUserStreak((req as any).userId);
    res.json({ currentStreak: streak?.currentStreak ?? 0, longestStreak: streak?.longestStreak ?? 0 });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Spin Wheel ────────────────────────────────────────────────────────────────
const DEFAULT_SPIN_PRIZES = [
  { type: "points", amount: 10 },
  { type: "points", amount: 20 },
  { type: "points", amount: 50 },
  { type: "points", amount: 5 },
  { type: "points", amount: 30 },
  { type: "points", amount: 100 },
  { type: "points", amount: 15 },
  { type: "points", amount: 25 },
];

async function getSpinPrizes() {
  try {
    const raw = await storage.getAppSetting("spin_prizes");
    if (raw) return JSON.parse(raw) as { type: string; amount: number }[];
  } catch {}
  return DEFAULT_SPIN_PRIZES;
}

router.get("/spin/can-spin", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const canSpin = await storage.canUserSpin(userId);
    let hoursUntilNextSpin: number | null = null;
    if (!canSpin) {
      const lastSpin = await storage.getLastSpin(userId);
      if (lastSpin) {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        hoursUntilNextSpin = (midnight.getTime() - Date.now()) / 3600000;
      }
    }
    res.json({ canSpin, hoursUntilNextSpin });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/spin", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const canSpin = await storage.canUserSpin(userId);
    if (!canSpin) { res.status(400).json({ error: "Already spun today" }); return; }
    const prizes = await getSpinPrizes();
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    await storage.recordSpin(userId, prize.type, prize.amount);
    await storage.addPoints(userId, prize.amount, "spin_wheel", `Spin wheel: +${prize.amount} points`);
    res.json({ rewardType: prize.type, rewardAmount: prize.amount, points: prize.amount });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/spin/prizes", async (_req, res) => {
  try {
    res.json(await getSpinPrizes());
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/spin/prizes", adminMiddleware, async (req, res) => {
  try {
    const prizes = req.body;
    if (!Array.isArray(prizes) || prizes.length === 0) {
      res.status(400).json({ error: "prizes must be a non-empty array" }); return;
    }
    await storage.setAppSetting("spin_prizes", JSON.stringify(prizes));
    res.json({ success: true, prizes });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Rewards (Gifts) ───────────────────────────────────────────────────────────
router.get("/rewards", async (_req, res) => {
  try {
    res.json(await storage.getRedeemGifts(true));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/rewards", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createRedeemGift(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/rewards/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteRedeemGift(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Redeem Requests ───────────────────────────────────────────────────────────
router.post("/redeem", authMiddleware, async (req, res) => {
  try {
    const { points, rewardType, rewardDetails } = req.body;
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);
    if (!user || user.points < points) { res.status(400).json({ error: "Insufficient points" }); return; }
    await storage.updateUser(userId, { points: user.points - points });
    res.status(201).json(await storage.createRedeemRequest({ userId, points, rewardType, rewardDetails, status: "pending" }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/redeem/my", authMiddleware, async (req, res) => {
  try {
    res.json(await storage.getUserRedeemHistory((req as any).userId));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/redeem", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.getAllRedeemRequests(req.query.status as string));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/redeem/:id/status", adminMiddleware, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    res.json(await storage.updateRedeemRequest(req.params.id, status, adminNotes));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Points History ────────────────────────────────────────────────────────────
router.get("/points/history", authMiddleware, async (req, res) => {
  try {
    res.json(await storage.getUserPointsHistory((req as any).userId));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/profile/points-history", authMiddleware, async (req, res) => {
  try {
    res.json(await storage.getUserPointsHistory((req as any).userId));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Content Categories ────────────────────────────────────────────────────────
router.get("/content-categories", async (_req, res) => {
  try {
    res.json(await storage.getContentCategories(false));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/content-categories", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createContentCategory(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/content-categories/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateContentCategory(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/content-categories/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteContentCategory(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Notes ─────────────────────────────────────────────────────────────────────
router.get("/notes", async (req, res) => {
  try {
    res.json(await storage.getNotes({
      categoryId: req.query.categoryId as string,
      subcategoryId: req.query.subcategoryId as string,
      search: req.query.search as string,
      activeOnly: req.query.admin === "true" ? false : true,
    }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/notes", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createNote(req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/notes/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateNote(req.params.id, req.body));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/notes/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteNote(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Competitions ──────────────────────────────────────────────────────────────
router.get("/competitions", async (_req, res) => {
  try {
    res.json(await storage.getCompetitions(false));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/competitions", adminMiddleware, async (req, res) => {
  try {
    res.status(201).json(await storage.createCompetition({
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/competitions/:id", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.updateCompetition(req.params.id, {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    }));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/competitions/:id", adminMiddleware, async (req, res) => {
  try {
    await storage.deleteCompetition(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/competitions/:id/join", authMiddleware, async (req, res) => {
  try {
    const entry = await storage.joinCompetition((req as any).userId, req.params.id);
    res.json({ success: true, entry });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/competitions/:id/submit", authMiddleware, async (req, res) => {
  try {
    const entry = await storage.submitCompetitionEntry((req as any).userId, req.params.id, req.body);
    res.json({ success: true, entry });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/competitions/:id/leaderboard", async (req, res) => {
  try {
    const board = await storage.getCompetitionLeaderboard(req.params.id);
    res.json(board.map((e, i) => ({ ...e, rank: i + 1 })));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/competitions/:id/my-entry", authMiddleware, async (req, res) => {
  try {
    const entry = await storage.getMyCompetitionEntry((req as any).userId, req.params.id);
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }
    res.json(entry);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Users (Admin) ─────────────────────────────────────────────────────────────
router.get("/users", adminMiddleware, async (req, res) => {
  try {
    res.json(await storage.getAllUsers(
      req.query.limit ? Number(req.query.limit) : 50,
      req.query.offset ? Number(req.query.offset) : 0,
    ));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/users/:id/status", adminMiddleware, async (req, res) => {
  try {
    const user = await storage.updateUser(req.params.id, { isActive: req.body.isActive });
    const { passwordHash: _, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
