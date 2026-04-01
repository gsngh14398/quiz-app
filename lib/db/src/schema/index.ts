import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Enums
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const rewardTypeEnum = pgEnum("reward_type", ["paytm", "upi", "gift_card"]);
export const redeemStatusEnum = pgEnum("redeem_status", ["pending", "approved", "rejected"]);
export const pointsTypeEnum = pgEnum("points_type", [
  "quiz_correct", "daily_login", "daily_quiz", "referral", "spin_wheel", "rewarded_ad", "streak_bonus"
]);

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  avatar: text("avatar"),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  points: integer("points").notNull().default(0),
  referralCode: varchar("referral_code", { length: 10 }).unique(),
  deviceId: text("device_id"),
  firebaseToken: text("firebase_token"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastLogin: timestamp("last_login"),
});

// Admin Users
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Categories (for Quiz)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("BookOpen"),
  color: text("color").notNull().default("#6366f1"),
  active: boolean("active").notNull().default(true),
  questionCount: integer("question_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Subcategories
export const subcategories = pgTable("subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  icon: text("icon").notNull().default("📝"),
  color: text("color").notNull().default("#6366f1"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Quizzes
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  subcategoryId: varchar("subcategory_id").notNull().references(() => subcategories.id, { onDelete: "cascade" }),
  difficulty: text("difficulty").notNull().default("medium"),
  timeLimit: integer("time_limit"),
  pointsPerQuestion: integer("points_per_question").notNull().default(10),
  totalQuestions: integer("total_questions").notNull().default(10),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Questions
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  subcategoryId: varchar("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation"),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Quiz Results
export const quizResults = pgTable("quiz_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  quizId: varchar("quiz_id").references(() => quizzes.id),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  timeTaken: integer("time_taken").notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
});

// Points History
export const pointsHistory = pgTable("points_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: pointsTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Redeem Requests
export const redeemRequests = pgTable("redeem_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  rewardDetails: jsonb("reward_details").notNull().$type<Record<string, string>>(),
  status: redeemStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  processedAt: timestamp("processed_at"),
});

// Redeem Gifts (available rewards)
export const redeemGifts = pgTable("redeem_gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  pointsRequired: integer("points_required").notNull(),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Referrals
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredId: varchar("referred_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Daily Streaks
export const dailyStreaks = pgTable("daily_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastLoginDate: text("last_login_date"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Spin Wheel History
export const spinWheelHistory = pgTable("spin_wheel_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardType: text("reward_type").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// App Settings (key-value config store)
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("general"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Content Categories (for notes)
export const contentCategories = pgTable("content_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("BookOpen"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Notes
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  pdfUrl: text("pdf_url"),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  subcategoryId: varchar("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),
  contentCategoryId: varchar("content_category_id").references(() => contentCategories.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Competitions
export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  quizId: varchar("quiz_id").references(() => quizzes.id),
  prizePool: integer("prize_pool").notNull().default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  maxParticipants: integer("max_participants"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Competition Entries
export const competitionEntries = pgTable("competition_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  competitionId: varchar("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  timeTaken: integer("time_taken"),
  pointsEarned: integer("points_earned"),
  rank: integer("rank"),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
  submittedAt: timestamp("submitted_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  quizResults: many(quizResults),
  pointsHistory: many(pointsHistory),
  redeemRequests: many(redeemRequests),
  streaks: many(dailyStreaks),
  spinHistory: many(spinWheelHistory),
  notifications: many(notifications),
  competitionEntries: many(competitionEntries),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  questions: many(questions),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, { fields: [subcategories.categoryId], references: [categories.id] }),
  quizzes: many(quizzes),
  questions: many(questions),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  subcategory: one(subcategories, { fields: [quizzes.subcategoryId], references: [subcategories.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  category: one(categories, { fields: [questions.categoryId], references: [categories.id] }),
  subcategory: one(subcategories, { fields: [questions.subcategoryId], references: [subcategories.id] }),
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
}));

export const contentCategoriesRelations = relations(contentCategories, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  contentCategory: one(contentCategories, { fields: [notes.contentCategoryId], references: [contentCategories.id] }),
}));

export const competitionsRelations = relations(competitions, ({ many }) => ({
  entries: many(competitionEntries),
}));

export const competitionEntriesRelations = relations(competitionEntries, ({ one }) => ({
  user: one(users, { fields: [competitionEntries.userId], references: [users.id] }),
  competition: one(competitions, { fields: [competitionEntries.competitionId], references: [competitions.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertSubcategorySchema = createInsertSchema(subcategories).omit({ id: true, createdAt: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export const insertRedeemGiftSchema = createInsertSchema(redeemGifts).omit({ id: true, createdAt: true });
export const insertRedeemRequestSchema = createInsertSchema(redeemRequests).omit({ id: true, createdAt: true, processedAt: true });
export const insertContentCategorySchema = createInsertSchema(contentCategories).omit({ id: true, createdAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });
export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type QuizResult = typeof quizResults.$inferSelect;
export type PointsHistory = typeof pointsHistory.$inferSelect;
export type RedeemRequest = typeof redeemRequests.$inferSelect;
export type RedeemGift = typeof redeemGifts.$inferSelect;
export type InsertRedeemGift = z.infer<typeof insertRedeemGiftSchema>;
export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type SpinWheelHistory = typeof spinWheelHistory.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ContentCategory = typeof contentCategories.$inferSelect;
export type InsertContentCategory = z.infer<typeof insertContentCategorySchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type CompetitionEntry = typeof competitionEntries.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
