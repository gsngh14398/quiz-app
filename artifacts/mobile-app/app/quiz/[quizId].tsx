import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Question {
  id: string; text: string; options: string[];
  timeLimit: number; points: number; order: number;
}

interface QuizDetails {
  id: string; title: string; timeLimit: number;
  totalQuestions: number; pointsReward: number; passingScore: number;
}

interface QuizResponse {
  quiz: QuizDetails; questions: Question[];
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function QuizPlayerScreen() {
  const { quizId, title } = useLocalSearchParams<{ quizId: string; title: string }>();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading } = useQuery<QuizResponse>({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const questions = data?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const questionTimeLimit = currentQuestion?.timeLimit ?? data?.quiz?.timeLimit ?? 30;

  const submitQuiz = useCallback(async (finalAnswers: Record<string, number>) => {
    if (quizEnded || submitting) return;
    setQuizEnded(true);
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const result = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/quiz-result",
        params: {
          score: result.score,
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
          pointsEarned: result.pointsEarned,
          passed: result.passed ? "1" : "0",
          title: title ?? data?.quiz?.title ?? "Quiz",
        },
      });
    } catch (err) {
      setSubmitting(false);
      setQuizEnded(false);
      Alert.alert("Error", "Failed to submit quiz. Please try again.");
    }
  }, [quizId, quizEnded, submitting, title, data]);

  const startTimer = useCallback((limit: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(limit);
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0, duration: limit * 1000,
      useNativeDriver: false,
    }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [progressAnim]);

  useEffect(() => {
    if (currentQuestion) startTimer(questionTimeLimit);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, currentQuestion]);

  useEffect(() => {
    if (timeLeft === 0 && currentQuestion && !quizEnded) {
      if (currentIndex < questions.length - 1) {
        setSelectedOption(null);
        setCurrentIndex(i => i + 1);
      } else {
        submitQuiz(answers);
      }
    }
  }, [timeLeft]);

  const handleOptionSelect = (optionIndex: number) => {
    if (selectedOption !== null || quizEnded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null || quizEnded) return;
    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);
    if (currentIndex < questions.length - 1) {
      setSelectedOption(null);
      setCurrentIndex(i => i + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const handleClose = () => {
    Alert.alert("Quit Quiz", "Your progress will be lost. Are you sure?", [
      { text: "Continue Quiz", style: "cancel" },
      { text: "Quit", style: "destructive", onPress: () => { if (timerRef.current) clearInterval(timerRef.current); router.back(); } },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#6C63FF" size="large" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>No questions found for this quiz</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const timerColor = timeLeft > questionTimeLimit * 0.5 ? "#43E97B" : timeLeft > questionTimeLimit * 0.25 ? "#F59E0B" : "#EF4444";
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Feather name="x" size={22} color="#8888A8" />
        </Pressable>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>{currentIndex + 1} / {questions.length}</Text>
        </View>
        <View style={[styles.timerBadge, { borderColor: timerColor }]}>
          <Feather name="clock" size={13} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      </View>

      <View style={styles.timerBarContainer}>
        <Animated.View style={[styles.timerBar, { width: progressWidth, backgroundColor: timerColor }]} />
      </View>

      <View style={styles.questionProgress}>
        {questions.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, {
              backgroundColor: i < currentIndex ? "#6C63FF" : i === currentIndex ? "#8B85FF" : "#2A2A3A",
              width: i === currentIndex ? 20 : 8,
            }]}
          />
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.pointsBadge}>
            <Feather name="zap" size={12} color="#FFD700" />
            <Text style={styles.pointsBadgeText}>{currentQuestion.points} pts</Text>
          </View>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
        </View>

        <View style={styles.options}>
          {currentQuestion.options.map((option, i) => {
            const isSelected = selectedOption === i;
            return (
              <Pressable
                key={i}
                onPress={() => handleOptionSelect(i)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  { opacity: pressed && selectedOption === null ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={isSelected ? ["#6C63FF", "#8B85FF"] : ["#13131A", "#13131A"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.optionGradient}
                >
                  <View style={[styles.optionLabel, isSelected && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                    <Text style={styles.optionLabelText}>{OPTION_LABELS[i]}</Text>
                  </View>
                  <Text style={[styles.optionText, isSelected && { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    {option}
                  </Text>
                  {isSelected && <Feather name="check-circle" size={18} color="#fff" />}
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleNext}
          disabled={selectedOption === null || submitting}
          style={({ pressed }) => [styles.nextButton, { opacity: selectedOption === null || submitting ? 0.4 : pressed ? 0.9 : 1 }]}
        >
          <LinearGradient colors={["#6C63FF", "#8B85FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGradient}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextText}>{currentIndex === questions.length - 1 ? "Submit Quiz" : "Next Question"}</Text>
                <Feather name={currentIndex === questions.length - 1 ? "check" : "arrow-right"} size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  center: { alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, justifyContent: "space-between" },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  progressInfo: { flex: 1, alignItems: "center" },
  progressText: { color: "#8888A8", fontFamily: "Inter_500Medium", fontSize: 14 },
  timerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  timerBarContainer: { height: 3, backgroundColor: "#1C1C27", marginHorizontal: 20, borderRadius: 2 },
  timerBar: { height: 3, borderRadius: 2 },
  questionProgress: { flexDirection: "row", gap: 4, paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  dot: { height: 6, borderRadius: 3 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  questionCard: {
    backgroundColor: "#13131A", borderRadius: 20, padding: 20,
    marginTop: 16, marginBottom: 20, borderWidth: 1, borderColor: "#2A2A3A",
  },
  pointsBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 12,
  },
  pointsBadgeText: { color: "#FFD700", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  questionText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff", lineHeight: 27 },
  options: { gap: 10 },
  option: { borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: "#2A2A3A" },
  optionSelected: { borderColor: "#6C63FF" },
  optionGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  optionLabel: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#2A2A3A", alignItems: "center", justifyContent: "center",
  },
  optionLabelText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  optionText: { flex: 1, color: "#CCCCDD", fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: "#0A0A0F", borderTopWidth: 1, borderTopColor: "#1C1C27" },
  nextButton: { borderRadius: 16, overflow: "hidden" },
  nextGradient: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 17 },
  errorText: { color: "#8888A8", fontFamily: "Inter_400Regular", fontSize: 16, marginTop: 16, textAlign: "center" },
  backButton: {
    marginTop: 20, backgroundColor: "#6C63FF", borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  backButtonText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
