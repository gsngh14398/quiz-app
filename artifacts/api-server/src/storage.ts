import {
  users, adminUsers, categories, subcategories, quizzes, questions, quizResults, pointsHistory,
  redeemRequests, redeemGifts, referrals, dailyStreaks, spinWheelHistory, notifications,
  contentCategories, notes, competitions, competitionEntries, appSettings,
  type User, type InsertUser, type AdminUser, type Category, type InsertCategory,
  type Subcategory, type InsertSubcategory, type Quiz, type InsertQuiz,
  type Question, type InsertQuestion, type QuizResult, type PointsHistory,
  type RedeemRequest, type RedeemGift, type InsertRedeemGift,
  type DailyStreak, type SpinWheelHistory, type Notification,
  type ContentCategory, type InsertContentCategory, type Note, type InsertNote,
  type Competition, type InsertCompetition, type CompetitionEntry,
} from "@workspace/db";
import { db } from "@workspace/db";
import { eq, desc, sql, and, gte, lt, count, asc, isNull } from "drizzle-orm";

export const storage = {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user;
  },

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  },

  async getAllUsers(limit = 50, offset = 0): Promise<{ users: User[]; total: number }> {
    const [countResult] = await db.select({ count: count() }).from(users);
    const list = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
    return { users: list, total: countResult.count };
  },

  // Admin Users
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  },

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return admin;
  },

  async createAdminUser(data: { email: string; passwordHash: string; name: string }): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsers).values(data).returning();
    return admin;
  },

  // Categories
  async getCategories(activeOnly = true): Promise<Category[]> {
    if (activeOnly) {
      return db.select().from(categories).where(eq(categories.active, true)).orderBy(categories.name);
    }
    return db.select().from(categories).orderBy(categories.name);
  },

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    return cat;
  },

  async createCategory(data: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(data).returning();
    return cat;
  },

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category> {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return cat;
  },

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  },

  // Subcategories
  async getSubcategories(categoryId?: string): Promise<(Subcategory & { categoryName: string })[]> {
    const query = db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        categoryId: subcategories.categoryId,
        categoryName: categories.name,
        icon: subcategories.icon,
        color: subcategories.color,
        active: subcategories.active,
        sortOrder: subcategories.sortOrder,
        createdAt: subcategories.createdAt,
      })
      .from(subcategories)
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .orderBy(asc(subcategories.sortOrder));

    if (categoryId) {
      return query.where(eq(subcategories.categoryId, categoryId)) as any;
    }
    return query as any;
  },

  async getSubcategoryById(id: string): Promise<(Subcategory & { categoryName: string }) | undefined> {
    const [sub] = await db
      .select({
        id: subcategories.id,
        name: subcategories.name,
        categoryId: subcategories.categoryId,
        categoryName: categories.name,
        icon: subcategories.icon,
        color: subcategories.color,
        active: subcategories.active,
        sortOrder: subcategories.sortOrder,
        createdAt: subcategories.createdAt,
      })
      .from(subcategories)
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(subcategories.id, id));
    return sub as any;
  },

  async createSubcategory(data: InsertSubcategory): Promise<Subcategory> {
    const [sub] = await db.insert(subcategories).values(data).returning();
    return sub;
  },

  async updateSubcategory(id: string, data: Partial<InsertSubcategory>): Promise<Subcategory> {
    const [sub] = await db.update(subcategories).set(data).where(eq(subcategories.id, id)).returning();
    return sub;
  },

  async deleteSubcategory(id: string): Promise<void> {
    await db.delete(subcategories).where(eq(subcategories.id, id));
  },

  // Quizzes
  async getQuizzes(subcategoryId?: string): Promise<(Quiz & { subcategoryName: string; categoryName: string; categoryId: string })[]> {
    const query = db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        subcategoryId: quizzes.subcategoryId,
        subcategoryName: subcategories.name,
        categoryName: categories.name,
        categoryId: categories.id,
        difficulty: quizzes.difficulty,
        timeLimit: quizzes.timeLimit,
        pointsPerQuestion: quizzes.pointsPerQuestion,
        totalQuestions: quizzes.totalQuestions,
        active: quizzes.active,
        sortOrder: quizzes.sortOrder,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .leftJoin(subcategories, eq(quizzes.subcategoryId, subcategories.id))
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .orderBy(asc(quizzes.sortOrder));

    if (subcategoryId) {
      return query.where(eq(quizzes.subcategoryId, subcategoryId)) as any;
    }
    return query as any;
  },

  async getQuizById(id: string): Promise<(Quiz & { subcategoryName: string; categoryName: string; categoryId: string }) | undefined> {
    const [quiz] = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        subcategoryId: quizzes.subcategoryId,
        subcategoryName: subcategories.name,
        categoryName: categories.name,
        categoryId: categories.id,
        difficulty: quizzes.difficulty,
        timeLimit: quizzes.timeLimit,
        pointsPerQuestion: quizzes.pointsPerQuestion,
        totalQuestions: quizzes.totalQuestions,
        active: quizzes.active,
        sortOrder: quizzes.sortOrder,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .leftJoin(subcategories, eq(quizzes.subcategoryId, subcategories.id))
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(quizzes.id, id));
    return quiz as any;
  },

  async createQuiz(data: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(data).returning();
    return quiz;
  },

  async updateQuiz(id: string, data: Partial<InsertQuiz>): Promise<Quiz> {
    const [quiz] = await db.update(quizzes).set(data).where(eq(quizzes.id, id)).returning();
    return quiz;
  },

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  },

  // Questions
  async getQuestionsByQuizId(quizId: string, limit?: number): Promise<Question[]> {
    const query = db.select().from(questions).where(and(eq(questions.quizId, quizId), eq(questions.active, true)));
    if (limit) return query.limit(limit);
    return query;
  },

  async getAllQuestions(opts: {
    categoryId?: string;
    subcategoryId?: string;
    quizId?: string;
    difficulty?: string;
    search?: string;
    bankOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ questions: Question[]; total: number }> {
    const conditions = [];
    if (opts.categoryId) conditions.push(eq(questions.categoryId, opts.categoryId));
    if (opts.subcategoryId) conditions.push(eq(questions.subcategoryId, opts.subcategoryId));
    if (opts.quizId) conditions.push(eq(questions.quizId, opts.quizId));
    if (opts.difficulty) conditions.push(eq(questions.difficulty, opts.difficulty as any));
    if (opts.bankOnly) conditions.push(isNull(questions.quizId));
    if (opts.search) conditions.push(sql`lower(${questions.question}) like lower(${'%' + opts.search + '%'})`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [countResult] = await db.select({ count: count() }).from(questions).where(where);
    const list = await db.select().from(questions).where(where)
      .orderBy(desc(questions.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0);
    return { questions: list, total: countResult.count };
  },

  async addQuestionsToQuiz(quizId: string, questionIds: string[]): Promise<{ added: number; skipped: number }> {
    const existing = await db.select({ q: questions.question }).from(questions).where(eq(questions.quizId, quizId));
    const existingTexts = new Set(existing.map(e => e.q.toLowerCase()));
    const sourceQs = await db.select().from(questions).where(
      sql`${questions.id} = ANY(ARRAY[${sql.raw(questionIds.map(id => `'${id}'`).join(','))}]::varchar[])`
    );
    const toAdd = sourceQs.filter(q => !existingTexts.has(q.question.toLowerCase()));
    if (toAdd.length === 0) return { added: 0, skipped: questionIds.length };
    const newQs = toAdd.map(({ id: _id, createdAt: _c, quizId: _q, ...rest }) => ({ ...rest, quizId }));
    await db.insert(questions).values(newQs);
    await db.update(quizzes).set({ totalQuestions: sql`${quizzes.totalQuestions} + ${toAdd.length}` }).where(eq(quizzes.id, quizId));
    return { added: toAdd.length, skipped: questionIds.length - toAdd.length };
  },

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const [q] = await db.insert(questions).values(data).returning();
    if (data.categoryId) {
      await db.update(categories).set({ questionCount: sql`${categories.questionCount} + 1` }).where(eq(categories.id, data.categoryId));
    }
    if (data.quizId) {
      await db.update(quizzes).set({ totalQuestions: sql`${quizzes.totalQuestions} + 1` }).where(eq(quizzes.id, data.quizId));
    }
    return q;
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const [q] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return q;
  },

  async deleteQuestion(id: string): Promise<void> {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    await db.delete(questions).where(eq(questions.id, id));
    if (q?.categoryId) {
      await db.update(categories).set({ questionCount: sql`GREATEST(${categories.questionCount} - 1, 0)` }).where(eq(categories.id, q.categoryId));
    }
    if (q?.quizId) {
      await db.update(quizzes).set({ totalQuestions: sql`GREATEST(${quizzes.totalQuestions} - 1, 0)` }).where(eq(quizzes.id, q.quizId));
    }
  },

  async duplicateQuiz(id: string): Promise<Quiz> {
    const [original] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    if (!original) throw new Error("Quiz not found");
    const [newQuiz] = await db.insert(quizzes).values({
      title: `${original.title} (Copy)`,
      description: original.description,
      subcategoryId: original.subcategoryId,
      difficulty: original.difficulty,
      timeLimit: original.timeLimit,
      pointsPerQuestion: original.pointsPerQuestion,
      totalQuestions: 0,
      active: false,
    }).returning();
    const originalQs = await db.select().from(questions).where(eq(questions.quizId, id));
    if (originalQs.length > 0) {
      const newQs = originalQs.map(({ id: _id, createdAt: _c, quizId: _q, ...rest }) => ({ ...rest, quizId: newQuiz.id }));
      await db.insert(questions).values(newQs);
      const [updated] = await db.update(quizzes).set({ totalQuestions: originalQs.length }).where(eq(quizzes.id, newQuiz.id)).returning();
      return updated;
    }
    return newQuiz;
  },

  async bulkCreateQuestions(qs: InsertQuestion[]): Promise<Question[]> {
    return db.insert(questions).values(qs).returning();
  },

  // Quiz Results
  async createQuizResult(data: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult> {
    const [result] = await db.insert(quizResults).values(data).returning();
    return result;
  },

  async getUserQuizResults(userId: string): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.userId, userId)).orderBy(desc(quizResults.completedAt)).limit(20);
  },

  // Points
  async addPoints(userId: string, amount: number, type: PointsHistory["type"], description: string): Promise<void> {
    await db.insert(pointsHistory).values({ userId, amount, type, description });
    await db.update(users).set({ points: sql`${users.points} + ${amount}` }).where(eq(users.id, userId));
  },

  async getUserPointsHistory(userId: string): Promise<PointsHistory[]> {
    return db.select().from(pointsHistory).where(eq(pointsHistory.userId, userId)).orderBy(desc(pointsHistory.createdAt)).limit(50);
  },

  // Leaderboard
  async getLeaderboard(period: "daily" | "weekly" | "global", limit = 50): Promise<Array<User & { rank: number; periodPoints: number }>> {
    if (period === "global") {
      const list = await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.points)).limit(limit);
      return list.map((u, i) => ({ ...u, rank: i + 1, periodPoints: u.points }));
    }

    const since = new Date();
    if (period === "daily") since.setHours(0, 0, 0, 0);
    else since.setDate(since.getDate() - 7);

    const periodPoints = await db
      .select({
        userId: pointsHistory.userId,
        total: sql<number>`cast(sum(${pointsHistory.amount}) as int)`,
      })
      .from(pointsHistory)
      .where(gte(pointsHistory.createdAt, since))
      .groupBy(pointsHistory.userId)
      .orderBy(desc(sql`sum(${pointsHistory.amount})`))
      .limit(limit);

    const userIds = periodPoints.map(p => p.userId);
    if (userIds.length === 0) return [];

    const userMap = new Map<string, User>();
    for (const id of userIds) {
      const u = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (u[0]) userMap.set(id, u[0]);
    }

    return periodPoints.map((p, i) => {
      const u = userMap.get(p.userId)!;
      if (!u) return null;
      return { ...u, rank: i + 1, periodPoints: p.total };
    }).filter(Boolean) as any;
  },

  // Redeem Gifts
  async getRedeemGifts(activeOnly = true): Promise<RedeemGift[]> {
    if (activeOnly) {
      return db.select().from(redeemGifts).where(eq(redeemGifts.active, true));
    }
    return db.select().from(redeemGifts);
  },

  async createRedeemGift(data: InsertRedeemGift): Promise<RedeemGift> {
    const [gift] = await db.insert(redeemGifts).values(data).returning();
    return gift;
  },

  async deleteRedeemGift(id: string): Promise<void> {
    await db.delete(redeemGifts).where(eq(redeemGifts.id, id));
  },

  // Redeem Requests
  async createRedeemRequest(data: Omit<RedeemRequest, "id" | "createdAt" | "processedAt" | "adminNotes">): Promise<RedeemRequest> {
    const [req] = await db.insert(redeemRequests).values(data as any).returning();
    return req;
  },

  async getUserRedeemHistory(userId: string): Promise<RedeemRequest[]> {
    return db.select().from(redeemRequests).where(eq(redeemRequests.userId, userId)).orderBy(desc(redeemRequests.createdAt));
  },

  async getAllRedeemRequests(status?: string): Promise<Array<RedeemRequest & { user: User }>> {
    const list = await db
      .select({
        id: redeemRequests.id,
        userId: redeemRequests.userId,
        points: redeemRequests.points,
        rewardType: redeemRequests.rewardType,
        rewardDetails: redeemRequests.rewardDetails,
        status: redeemRequests.status,
        adminNotes: redeemRequests.adminNotes,
        createdAt: redeemRequests.createdAt,
        processedAt: redeemRequests.processedAt,
        user: users,
      })
      .from(redeemRequests)
      .leftJoin(users, eq(redeemRequests.userId, users.id))
      .where(status ? eq(redeemRequests.status, status as any) : undefined)
      .orderBy(desc(redeemRequests.createdAt));
    return list as any;
  },

  async updateRedeemRequest(id: string, status: "approved" | "rejected", adminNotes?: string): Promise<RedeemRequest> {
    const [req] = await db
      .update(redeemRequests)
      .set({ status, adminNotes, processedAt: new Date() })
      .where(eq(redeemRequests.id, id))
      .returning();
    return req;
  },

  // Referrals
  async createReferral(referrerId: string, referredId: string): Promise<void> {
    await db.insert(referrals).values({ referrerId, referredId });
  },

  // Streaks
  async getUserStreak(userId: string): Promise<DailyStreak | undefined> {
    const [streak] = await db.select().from(dailyStreaks).where(eq(dailyStreaks.userId, userId));
    return streak;
  },

  async updateStreak(userId: string, today: string): Promise<{ streak: DailyStreak; isNew: boolean }> {
    const existing = await this.getUserStreak(userId);

    if (!existing) {
      const [streak] = await db.insert(dailyStreaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastLoginDate: today,
      }).returning();
      return { streak, isNew: true };
    }

    if (existing.lastLoginDate === today) {
      return { streak: existing, isNew: false };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const newStreak = existing.lastLoginDate === yesterdayStr ? existing.currentStreak + 1 : 1;
    const [streak] = await db
      .update(dailyStreaks)
      .set({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, existing.longestStreak),
        lastLoginDate: today,
        updatedAt: new Date(),
      })
      .where(eq(dailyStreaks.userId, userId))
      .returning();
    return { streak, isNew: existing.lastLoginDate !== today };
  },

  // Spin Wheel
  async canUserSpin(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [spin] = await db
      .select()
      .from(spinWheelHistory)
      .where(and(eq(spinWheelHistory.userId, userId), gte(spinWheelHistory.createdAt, today)));
    return !spin;
  },

  async recordSpin(userId: string, rewardType: string, rewardAmount: number): Promise<SpinWheelHistory> {
    const [spin] = await db.insert(spinWheelHistory).values({ userId, rewardType, rewardAmount }).returning();
    return spin;
  },

  async getLastSpin(userId: string): Promise<SpinWheelHistory | undefined> {
    const [spin] = await db
      .select()
      .from(spinWheelHistory)
      .where(eq(spinWheelHistory.userId, userId))
      .orderBy(desc(spinWheelHistory.createdAt))
      .limit(1);
    return spin;
  },

  // App Settings
  async getAppSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row?.value ?? null;
  },

  async setAppSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: sql`now()` } });
  },

  // Notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
  },

  async createNotification(userId: string | null, title: string, body: string, type: string): Promise<Notification> {
    const [notif] = await db.insert(notifications).values({ userId, title, body, type }).returning();
    return notif;
  },

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  },

  // Analytics
  async getAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsersRow] = await db.select({ count: count() }).from(users);
    const [activeTodayRow] = await db.select({ count: count() }).from(users).where(gte(users.lastLogin, today));
    const [quizzesTodayRow] = await db.select({ count: count() }).from(quizResults).where(gte(quizResults.completedAt, today));
    const [pointsRow] = await db.select({ total: sql<number>`cast(coalesce(sum(${pointsHistory.amount}), 0) as int)` }).from(pointsHistory);
    const [pendingRow] = await db.select({ count: count() }).from(redeemRequests).where(eq(redeemRequests.status, "pending"));
    const [redeemPointsRow] = await db.select({ total: sql<number>`cast(coalesce(sum(${redeemRequests.points}), 0) as int)` }).from(redeemRequests);

    return {
      totalUsers: totalUsersRow.count,
      activeToday: activeTodayRow.count,
      quizzesPlayedToday: quizzesTodayRow.count,
      totalPointsDistributed: pointsRow.total ?? 0,
      pendingRedeems: pendingRow.count,
      totalRedeemPoints: redeemPointsRow.total ?? 0,
    };
  },

  async getQuizAttemptCount(userId: string, categoryId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(quizResults)
      .where(and(
        eq(quizResults.userId, userId),
        eq(quizResults.categoryId, categoryId),
        gte(quizResults.completedAt, since),
      ));
    return row.count;
  },

  // Content Categories
  async getContentCategories(activeOnly = true): Promise<ContentCategory[]> {
    if (activeOnly) {
      return db.select().from(contentCategories).where(eq(contentCategories.active, true)).orderBy(contentCategories.name);
    }
    return db.select().from(contentCategories).orderBy(contentCategories.name);
  },

  async createContentCategory(data: InsertContentCategory): Promise<ContentCategory> {
    const [cat] = await db.insert(contentCategories).values(data).returning();
    return cat;
  },

  async updateContentCategory(id: string, data: Partial<InsertContentCategory>): Promise<ContentCategory> {
    const [cat] = await db.update(contentCategories).set(data).where(eq(contentCategories.id, id)).returning();
    return cat;
  },

  async deleteContentCategory(id: string): Promise<void> {
    await db.delete(contentCategories).where(eq(contentCategories.id, id));
  },

  // Notes
  async getNotes(opts: { categoryId?: string; subcategoryId?: string; search?: string; activeOnly?: boolean } = {}): Promise<(Note & { categoryName?: string; subcategoryName?: string })[]> {
    const conditions: any[] = [];
    if (opts.activeOnly !== false) conditions.push(eq(notes.active, true));
    if (opts.categoryId) conditions.push(eq(notes.categoryId, opts.categoryId));
    if (opts.subcategoryId) conditions.push(eq(notes.subcategoryId, opts.subcategoryId));
    if (opts.search) conditions.push(sql`lower(${notes.title}) like lower(${'%' + opts.search + '%'})`);
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db
      .select({
        note: notes,
        categoryName: categories.name,
        subcategoryName: subcategories.name,
      })
      .from(notes)
      .leftJoin(categories, eq(notes.categoryId, categories.id))
      .leftJoin(subcategories, eq(notes.subcategoryId, subcategories.id))
      .where(where)
      .orderBy(desc(notes.createdAt));
    return rows.map(r => ({ ...r.note, categoryName: r.categoryName ?? undefined, subcategoryName: r.subcategoryName ?? undefined }));
  },

  async createNote(data: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(data).returning();
    return note;
  },

  async updateNote(id: string, data: Partial<InsertNote>): Promise<Note> {
    const [note] = await db.update(notes).set(data).where(eq(notes.id, id)).returning();
    return note;
  },

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  },

  // Competitions
  async getCompetitions(activeOnly = false): Promise<Competition[]> {
    if (activeOnly) {
      return db.select().from(competitions).where(eq(competitions.active, true)).orderBy(desc(competitions.createdAt));
    }
    return db.select().from(competitions).orderBy(desc(competitions.createdAt));
  },

  async getCompetitionById(id: string): Promise<Competition | undefined> {
    const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
    return comp;
  },

  async createCompetition(data: InsertCompetition): Promise<Competition> {
    const [comp] = await db.insert(competitions).values(data).returning();
    return comp;
  },

  async updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition> {
    const [comp] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return comp;
  },

  async deleteCompetition(id: string): Promise<void> {
    await db.delete(competitions).where(eq(competitions.id, id));
  },

  async joinCompetition(userId: string, competitionId: string): Promise<CompetitionEntry> {
    const existing = await db.select().from(competitionEntries)
      .where(and(eq(competitionEntries.userId, userId), eq(competitionEntries.competitionId, competitionId)));
    if (existing[0]) return existing[0];
    const [entry] = await db.insert(competitionEntries).values({ userId, competitionId }).returning();
    return entry;
  },

  async submitCompetitionEntry(userId: string, competitionId: string, data: {
    score: number; totalQuestions: number; timeTaken: number; pointsEarned: number;
  }): Promise<CompetitionEntry> {
    const [entry] = await db.update(competitionEntries)
      .set({ ...data, submittedAt: new Date() })
      .where(and(eq(competitionEntries.userId, userId), eq(competitionEntries.competitionId, competitionId)))
      .returning();
    return entry;
  },

  async getCompetitionLeaderboard(competitionId: string): Promise<Array<CompetitionEntry & { userName: string }>> {
    const entries = await db
      .select({
        id: competitionEntries.id,
        userId: competitionEntries.userId,
        competitionId: competitionEntries.competitionId,
        score: competitionEntries.score,
        totalQuestions: competitionEntries.totalQuestions,
        timeTaken: competitionEntries.timeTaken,
        pointsEarned: competitionEntries.pointsEarned,
        rank: competitionEntries.rank,
        joinedAt: competitionEntries.joinedAt,
        submittedAt: competitionEntries.submittedAt,
        userName: users.name,
      })
      .from(competitionEntries)
      .leftJoin(users, eq(competitionEntries.userId, users.id))
      .where(eq(competitionEntries.competitionId, competitionId))
      .orderBy(desc(competitionEntries.score), asc(competitionEntries.timeTaken));
    return entries as any;
  },

  async getMyCompetitionEntry(userId: string, competitionId: string): Promise<CompetitionEntry | undefined> {
    const [entry] = await db.select().from(competitionEntries)
      .where(and(eq(competitionEntries.userId, userId), eq(competitionEntries.competitionId, competitionId)));
    return entry;
  },
};
