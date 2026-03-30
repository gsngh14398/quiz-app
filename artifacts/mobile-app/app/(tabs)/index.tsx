import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, View, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Category {
  id: string; name: string; icon: string; color: string;
  active: boolean; questionCount: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  BookOpen: "book-open", Brain: "cpu", Calculator: "bar-chart-2",
  Beaker: "activity", Globe: "globe", Code: "code",
  Music: "music", Film: "film", Heart: "heart",
};

function CategoryCard({ category, index }: { category: Category; index: number }) {
  const GRADIENTS: [string, string][] = [
    ["#6C63FF", "#9C8DFF"], ["#FF6584", "#FF8FA3"],
    ["#43E97B", "#38F9D7"], ["#F093FB", "#F5576C"],
    ["#4FACFE", "#00F2FE"], ["#FA709A", "#FEE140"],
    ["#30CFD0", "#667EEA"], ["#A18CD1", "#FBC2EB"],
  ];
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const iconName = (CATEGORY_ICONS[category.icon] || "book") as any;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/subcategories/[categoryId]", params: { categoryId: category.id, name: category.name } });
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
        <View style={styles.cardIconContainer}>
          <Feather name={iconName} size={28} color="rgba(255,255,255,0.95)" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{category.name}</Text>
          <Text style={styles.cardCount}>{category.questionCount} questions</Text>
        </View>
        <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const domain = process.env.EXPO_PUBLIC_DOMAIN;

  const { data: categories, isLoading, refetch } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`https://${domain}/api/categories`);
      return res.json();
    },
  });

  const { data: streak } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("quiz_token");
      const res = await fetch(`https://${domain}/api/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!user,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeGreeting()},</Text>
            <Text style={styles.userName}>{user?.name ?? "Quizzer"}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Feather name="zap" size={14} color="#FFD700" />
              <Text style={styles.statText}>{user?.points ?? 0}</Text>
            </View>
            {!!streak && (
              <View style={[styles.statBadge, { marginLeft: 8 }]}>
                <Feather name="flame" size={14} color="#FF6B6B" />
                <Text style={styles.statText}>{streak.currentStreak}d</Text>
              </View>
            )}
          </View>
        </View>

        <LinearGradient
          colors={["rgba(108,99,255,0.15)", "rgba(108,99,255,0.05)"]}
          style={styles.banner}
        >
          <Feather name="trending-up" size={20} color="#8B85FF" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.bannerTitle}>Daily Quiz Challenge</Text>
            <Text style={styles.bannerSubtitle}>Complete quizzes to earn points & maintain your streak</Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Choose Category</Text>

        {isLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 40 }} />
        ) : !categories?.length ? (
          <View style={styles.empty}>
            <Feather name="folder" size={48} color="#555570" />
            <Text style={styles.emptyText}>No categories yet</Text>
            <Text style={styles.emptySubtext}>Check back later or ask an admin to add content</Text>
          </View>
        ) : (
          categories.map((cat, i) => <CategoryCard key={cat.id} category={cat} index={i} />)
        )}
      </ScrollView>
    </View>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 8 },
  greeting: { fontSize: 14, color: "#8888A8", fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
  statsRow: { flexDirection: "row" },
  statBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1C1C27", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  statText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  banner: {
    flexDirection: "row", alignItems: "center", borderRadius: 16,
    padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "rgba(108,99,255,0.3)",
  },
  bannerTitle: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  bannerSubtitle: { color: "#8888A8", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 14 },
  card: { marginBottom: 12 },
  cardGradient: {
    flexDirection: "row", alignItems: "center", borderRadius: 18,
    padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  cardIconContainer: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cardCount: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#8888A8", fontFamily: "Inter_500Medium", fontSize: 18 },
  emptySubtext: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
});
