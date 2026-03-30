import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const TABS = ["daily", "weekly", "allTime"] as const;
type Period = typeof TABS[number];

interface LeaderboardEntry {
  userId: string; name: string; points: number;
  rank: number; avatar?: string | null;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <LinearGradient colors={["#FFD700", "#FFA500"]} style={styles.rankBadge}><Text style={styles.rankBadgeText}>1</Text></LinearGradient>;
  if (rank === 2) return <LinearGradient colors={["#C0C0C0", "#A8A8A8"]} style={styles.rankBadge}><Text style={styles.rankBadgeText}>2</Text></LinearGradient>;
  if (rank === 3) return <LinearGradient colors={["#CD7F32", "#B8721D"]} style={styles.rankBadge}><Text style={styles.rankBadgeText}>3</Text></LinearGradient>;
  return <View style={[styles.rankBadge, { backgroundColor: "#1C1C27" }]}><Text style={[styles.rankBadgeText, { color: "#8888A8" }]}>{rank}</Text></View>;
}

function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <View style={[styles.entryRow, isMe && styles.entryRowMe]}>
      <RankBadge rank={entry.rank} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{entry.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.entryName, isMe && { color: "#8B85FF" }]}>{entry.name}{isMe ? " (You)" : ""}</Text>
      </View>
      <View style={styles.pointsBadge}>
        <Feather name="zap" size={12} color="#FFD700" />
        <Text style={styles.pointsText}>{entry.points}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("weekly");

  const { data, isLoading, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/leaderboard?period=${period}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.json();
    },
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const top3 = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Leaderboard</Text>

        <View style={styles.tabRow}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setPeriod(t)} style={[styles.tab, period === t && styles.tabActive]}>
              <Text style={[styles.tabText, period === t && styles.tabTextActive]}>
                {t === "allTime" ? "All Time" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => item.userId}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          ListHeaderComponent={() => (
            top3.length >= 1 ? (
              <View style={styles.podium}>
                {top3[1] && (
                  <View style={[styles.podiumItem, { marginTop: 30 }]}>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#2A2A3A" }]}>
                      <Text style={styles.podiumAvatarText}>{top3[1].name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                    <LinearGradient colors={["#C0C0C0", "#A8A8A8"]} style={[styles.podiumBlock, { height: 60 }]}>
                      <Text style={styles.podiumRank}>2</Text>
                    </LinearGradient>
                  </View>
                )}
                {top3[0] && (
                  <View style={styles.podiumItem}>
                    <Feather name="award" size={20} color="#FFD700" style={{ marginBottom: 4 }} />
                    <View style={[styles.podiumAvatar, { backgroundColor: "#2A2A3A", width: 64, height: 64, borderRadius: 32 }]}>
                      <Text style={[styles.podiumAvatarText, { fontSize: 22 }]}>{top3[0].name.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.podiumName, { fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{top3[0].name}</Text>
                    <LinearGradient colors={["#FFD700", "#FFA500"]} style={[styles.podiumBlock, { height: 80 }]}>
                      <Text style={styles.podiumRank}>1</Text>
                    </LinearGradient>
                  </View>
                )}
                {top3[2] && (
                  <View style={[styles.podiumItem, { marginTop: 40 }]}>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#2A2A3A" }]}>
                      <Text style={styles.podiumAvatarText}>{top3[2].name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                    <LinearGradient colors={["#CD7F32", "#B8721D"]} style={[styles.podiumBlock, { height: 45 }]}>
                      <Text style={styles.podiumRank}>3</Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            ) : null
          )}
          renderItem={({ item }) => (
            <EntryRow entry={item} isMe={item.userId === user?.id} />
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="trophy" size={48} color="#555570" />
              <Text style={styles.emptyText}>No rankings yet</Text>
            </View>
          )}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  headerSection: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 16, marginTop: 8 },
  tabRow: { flexDirection: "row", backgroundColor: "#13131A", borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: "#2A2A3A" },
  tab: { flex: 1, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#6C63FF" },
  tabText: { color: "#555570", fontFamily: "Inter_500Medium", fontSize: 13 },
  tabTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  podium: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginBottom: 24, gap: 12 },
  podiumItem: { alignItems: "center", width: 90 },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  podiumAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  podiumName: { fontSize: 11, color: "#fff", fontFamily: "Inter_500Medium", marginBottom: 6, textAlign: "center" },
  podiumBlock: { width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: "center", justifyContent: "center" },
  podiumRank: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  entryRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#13131A",
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#2A2A3A", gap: 12,
  },
  entryRowMe: { borderColor: "#6C63FF", backgroundColor: "rgba(108,99,255,0.08)" },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#2A2A3A", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#8B85FF" },
  entryName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pointsText: { color: "#FFD700", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 16 },
});
