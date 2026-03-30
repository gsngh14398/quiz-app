import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Quiz {
  id: string; title: string; description?: string | null;
  timeLimit: number; totalQuestions: number; passingScore: number;
  pointsReward: number; active: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#43E97B", medium: "#F59E0B", hard: "#EF4444",
};

export default function QuizzesScreen() {
  const { subcategoryId, name } = useLocalSearchParams<{ subcategoryId: string; name: string }>();
  const insets = useSafeAreaInsets();

  const { data: quizzes, isLoading } = useQuery<Quiz[]>({
    queryKey: ["quizzes", subcategoryId],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/quizzes?subcategoryId=${subcategoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{name}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={quizzes ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/quiz/[quizId]", params: { quizId: item.id, title: item.title } });
              }}
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={["rgba(108,99,255,0.1)", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <Feather name="clipboard" size={22} color="#8B85FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardStats}>
                  <View style={styles.stat}>
                    <Feather name="help-circle" size={13} color="#8888A8" />
                    <Text style={styles.statText}>{item.totalQuestions} questions</Text>
                  </View>
                  <View style={styles.stat}>
                    <Feather name="clock" size={13} color="#8888A8" />
                    <Text style={styles.statText}>{item.timeLimit}s timer</Text>
                  </View>
                  <View style={styles.stat}>
                    <Feather name="zap" size={13} color="#FFD700" />
                    <Text style={[styles.statText, { color: "#FFD700" }]}>{item.pointsReward} pts</Text>
                  </View>
                </View>
                <LinearGradient colors={["#6C63FF", "#8B85FF"]} style={styles.startButton}>
                  <Text style={styles.startText}>Start Quiz</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </LinearGradient>
              </LinearGradient>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="clipboard" size={48} color="#555570" />
              <Text style={styles.emptyText}>No quizzes available yet</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  back: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(108,99,255,0.3)" },
  cardGradient: { padding: 18 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "rgba(108,99,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 3 },
  cardDesc: { fontSize: 13, color: "#8888A8", fontFamily: "Inter_400Regular" },
  cardStats: { flexDirection: "row", gap: 16, marginBottom: 14 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12, color: "#8888A8", fontFamily: "Inter_400Regular" },
  startButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, height: 42,
  },
  startText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 16 },
});
