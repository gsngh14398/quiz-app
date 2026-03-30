import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator, Alert, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface PointsHistory { id: string; points: number; reason: string; createdAt: string; }

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={[color + "33", color + "11"]} style={styles.statIconWrap}>
        <Feather name={icon as any} size={20} color={color} />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? "rgba(239,68,68,0.1)" : "#1C1C27" }]}>
        <Feather name={icon as any} size={18} color={danger ? "#EF4444" : "#8888A8"} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: "#EF4444" }]}>{label}</Text>
      {!danger && <Feather name="chevron-right" size={16} color="#555570" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: streak } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const { data: history, isLoading } = useQuery<PointsHistory[]>({
    queryKey: ["points-history"],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/points/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPadding }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <LinearGradient colors={["#6C63FF", "#8B85FF"]} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
        </LinearGradient>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.referralCode && (
          <View style={styles.referralBadge}>
            <Feather name="gift" size={12} color="#8B85FF" />
            <Text style={styles.referralText}>Ref: {user.referralCode}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="zap" label="Total Points" value={String(user?.points ?? 0)} color="#6C63FF" />
        <StatCard icon="flame" label="Streak" value={`${streak?.currentStreak ?? 0}d`} color="#FF6B6B" />
        <StatCard icon="trending-up" label="Best Streak" value={`${streak?.longestStreak ?? 0}d`} color="#43E97B" />
        <StatCard icon="calendar" label="Last Active" value={streak?.lastActiveDate ? new Date(streak.lastActiveDate).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"} color="#4FACFE" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="gift" label="Redeem Points" onPress={() => router.push("/redeem")} />
          <MenuItem icon="award" label="Leaderboard" onPress={() => router.push("/(tabs)/leaderboard")} />
          <MenuItem icon="book-open" label="Study Notes" onPress={() => router.push("/(tabs)/notes")} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Points</Text>
        {isLoading ? (
          <ActivityIndicator color="#6C63FF" />
        ) : !history?.length ? (
          <Text style={styles.noHistory}>No points history yet</Text>
        ) : (
          <View style={styles.historyList}>
            {history.map(item => (
              <View key={item.id} style={styles.historyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyReason}>{formatReason(item.reason)}</Text>
                  <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.historyPoints, { color: item.points >= 0 ? "#22C55E" : "#EF4444" }]}>
                  {item.points >= 0 ? "+" : ""}{item.points} pts
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.menuGroup}>
          <MenuItem icon="log-out" label="Sign Out" onPress={handleLogout} danger />
        </View>
      </View>
    </ScrollView>
  );
}

function formatReason(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  profileHeader: { alignItems: "center", marginTop: 8, marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12, shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#8888A8", fontFamily: "Inter_400Regular" },
  referralBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(108,99,255,0.15)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 8,
  },
  referralText: { color: "#8B85FF", fontFamily: "Inter_500Medium", fontSize: 13 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: "45%", backgroundColor: "#13131A",
    borderRadius: 16, padding: 14, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  statIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 11, color: "#8888A8", fontFamily: "Inter_400Regular" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#8888A8", marginBottom: 10 },
  menuGroup: { backgroundColor: "#13131A", borderRadius: 16, borderWidth: 1, borderColor: "#2A2A3A", overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: "#2A2A3A" },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, color: "#fff", fontFamily: "Inter_500Medium" },
  noHistory: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingVertical: 16 },
  historyList: { backgroundColor: "#13131A", borderRadius: 16, borderWidth: 1, borderColor: "#2A2A3A", overflow: "hidden" },
  historyItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2A2A3A" },
  historyReason: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#fff" },
  historyDate: { fontSize: 11, color: "#555570", fontFamily: "Inter_400Regular", marginTop: 2 },
  historyPoints: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
