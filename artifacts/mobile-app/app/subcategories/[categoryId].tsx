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

interface Subcategory {
  id: string; name: string; description?: string | null;
  active: boolean; quizCount: number;
}

export default function SubcategoriesScreen() {
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name: string }>();
  const insets = useSafeAreaInsets();

  const { data: subcategories, isLoading } = useQuery<Subcategory[]>({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/subcategories?categoryId=${categoryId}`, {
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
          data={subcategories ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const COLORS = ["#6C63FF", "#FF6584", "#43E97B", "#F093FB", "#4FACFE", "#FA709A"];
            const color = COLORS[index % COLORS.length];
            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/quizzes/[subcategoryId]", params: { subcategoryId: item.id, name: item.name } });
                }}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.cardAccent, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                  <View style={styles.cardMeta}>
                    <Feather name="list" size={12} color="#8888A8" />
                    <Text style={styles.cardMetaText}>{item.quizCount} quizzes</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#555570" />
              </Pressable>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="inbox" size={48} color="#555570" />
              <Text style={styles.emptyText}>No subcategories yet</Text>
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
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#13131A", borderRadius: 16,
    marginBottom: 10, overflow: "hidden",
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  cardAccent: { width: 4, alignSelf: "stretch" },
  cardContent: { flex: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#8888A8", fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardMetaText: { fontSize: 12, color: "#8888A8", fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 16 },
});
