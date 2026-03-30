import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function QuizResultScreen() {
  const insets = useSafeAreaInsets();
  const { score, totalQuestions, correctAnswers, pointsEarned, passed, title } =
    useLocalSearchParams<{
      score: string; totalQuestions: string; correctAnswers: string;
      pointsEarned: string; passed: string; title: string;
    }>();

  const isPassed = passed === "1";
  const scoreNum = parseInt(score ?? "0");
  const correctNum = parseInt(correctAnswers ?? "0");
  const totalNum = parseInt(totalQuestions ?? "0");
  const pointsNum = parseInt(pointsEarned ?? "0");

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(isPassed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const getScoreColor = () => {
    if (scoreNum >= 80) return "#43E97B";
    if (scoreNum >= 60) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={isPassed ? ["rgba(67,233,123,0.15)", "transparent"] : ["rgba(239,68,68,0.15)", "transparent"]}
        style={styles.bg}
      />

      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={isPassed ? ["#43E97B", "#38F9D7"] : ["#EF4444", "#F97316"]}
          style={styles.resultIcon}
        >
          <Feather name={isPassed ? "check" : "x"} size={40} color="#fff" />
        </LinearGradient>

        <Text style={styles.resultTitle}>{isPassed ? "Excellent!" : "Better Luck Next Time"}</Text>
        <Text style={styles.quizTitle}>{title}</Text>

        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNum, { color: getScoreColor() }]}>{scoreNum}%</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
        <View style={styles.statCard}>
          <Feather name="check-circle" size={22} color="#43E97B" />
          <Text style={styles.statValue}>{correctNum}/{totalNum}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name="zap" size={22} color="#FFD700" />
          <Text style={styles.statValue}>+{pointsNum}</Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Feather name={isPassed ? "award" : "rotate-ccw"} size={22} color={isPassed ? "#6C63FF" : "#8888A8"} />
          <Text style={styles.statValue}>{isPassed ? "Pass" : "Fail"}</Text>
          <Text style={styles.statLabel}>Result</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient colors={["#6C63FF", "#8B85FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
            <Feather name="home" size={18} color="#fff" />
            <Text style={styles.primaryText}>Back to Home</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="rotate-ccw" size={16} color="#6C63FF" />
          <Text style={styles.secondaryText}>Try Again</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F", alignItems: "center", paddingHorizontal: 24 },
  bg: { ...StyleSheet.absoluteFillObject },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
  resultIcon: {
    width: 90, height: 90, borderRadius: 30, alignItems: "center",
    justifyContent: "center", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 20,
  },
  resultTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4, textAlign: "center" },
  quizTitle: { fontSize: 14, color: "#8888A8", fontFamily: "Inter_400Regular", marginBottom: 32, textAlign: "center" },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "#13131A", borderWidth: 4, borderColor: "#2A2A3A",
    alignItems: "center", justifyContent: "center",
  },
  scoreNum: { fontSize: 42, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 13, color: "#8888A8", fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", gap: 12, width: "100%", marginBottom: 32 },
  statCard: {
    flex: 1, backgroundColor: "#13131A", borderRadius: 16,
    padding: 16, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 11, color: "#8888A8", fontFamily: "Inter_400Regular" },
  actions: { width: "100%", gap: 12, paddingBottom: 8 },
  primaryButton: { borderRadius: 16, overflow: "hidden" },
  primaryGradient: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 17 },
  secondaryButton: {
    height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1, borderColor: "#6C63FF", borderRadius: 16,
  },
  secondaryText: { color: "#6C63FF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
