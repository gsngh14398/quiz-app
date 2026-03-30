import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Platform,
  Pressable, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface RedeemGift {
  id: string; name: string; description: string;
  pointsRequired: number; rewardType: string; imageUrl?: string | null; active: boolean;
}

interface RedeemRequest {
  id: string; status: string; createdAt: string;
  points: number; rewardType: string;
  rewardDetails?: { giftId?: string; giftName?: string };
}

export default function RedeemScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const qc = useQueryClient();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gifts" | "history">("gifts");

  const headers = { Authorization: `Bearer ${token}` };

  const { data: gifts, isLoading: giftsLoading, isError: giftsError } = useQuery<RedeemGift[]>({
    queryKey: ["redeem-gifts"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/rewards`, { headers });
      if (!res.ok) throw new Error("Failed to load gifts");
      const data = await res.json();
      return Array.isArray(data) ? data.filter((g: RedeemGift) => g.active) : [];
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery<RedeemRequest[]>({
    queryKey: ["redeem-history"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/redeem/my`, { headers });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: activeTab === "history",
  });

  const handleRedeem = async (gift: RedeemGift) => {
    if (!user || user.points < gift.pointsRequired) {
      Alert.alert("Insufficient Points", `You need ${gift.pointsRequired - (user?.points ?? 0)} more points to redeem this.`);
      return;
    }
    Alert.alert(
      "Confirm Redemption",
      `Redeem "${gift.name}" for ${gift.pointsRequired} points?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem", onPress: async () => {
            setRedeeming(gift.id);
            try {
              const res = await fetch(`${BASE}/api/redeem`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                  points: gift.pointsRequired,
                  rewardType: gift.rewardType,
                  rewardDetails: { giftId: gift.id, giftName: gift.name },
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Redemption failed");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (user) await updateUser({ ...user, points: user.points - gift.pointsRequired });
              qc.invalidateQueries({ queryKey: ["redeem-history"] });
              Alert.alert("Success!", "Your redemption request has been submitted. We'll process it soon.");
            } catch (err: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", err.message);
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  const topPadding = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Redeem Points</Text>
        <View style={styles.pointsBadge}>
          <Feather name="zap" size={14} color="#FFD700" />
          <Text style={styles.pointsText}>{user?.points ?? 0}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab("gifts")} style={[styles.tab, activeTab === "gifts" && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === "gifts" && styles.tabTextActive]}>Available Gifts</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("history")} style={[styles.tab, activeTab === "history" && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>My Requests</Text>
        </Pressable>
      </View>

      {activeTab === "gifts" ? (
        giftsLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
        ) : giftsError ? (
          <View style={styles.empty}>
            <Feather name="alert-circle" size={48} color="#EF4444" />
            <Text style={[styles.emptyText, { color: "#EF4444" }]}>Failed to load gifts</Text>
            <Text style={styles.emptySubText}>Please check your connection and try again</Text>
          </View>
        ) : (
          <FlatList
            data={gifts ?? []}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const canAfford = (user?.points ?? 0) >= item.pointsRequired;
              return (
                <View style={styles.giftCard}>
                  <LinearGradient
                    colors={canAfford ? ["rgba(108,99,255,0.15)", "transparent"] : ["rgba(30,30,50,0.5)", "transparent"]}
                    style={styles.giftGradient}
                  >
                    <View style={styles.giftHeader}>
                      <View style={[styles.giftIcon, { backgroundColor: canAfford ? "rgba(108,99,255,0.2)" : "#1C1C27" }]}>
                        <Feather name="gift" size={24} color={canAfford ? "#8B85FF" : "#555570"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.giftName}>{item.name}</Text>
                        <Text style={styles.giftDesc} numberOfLines={2}>{item.description || item.rewardType}</Text>
                      </View>
                    </View>
                    <View style={styles.giftFooter}>
                      <View style={styles.giftCost}>
                        <Feather name="zap" size={14} color="#FFD700" />
                        <Text style={styles.giftCostText}>{item.pointsRequired} pts</Text>
                      </View>
                      <Pressable
                        onPress={() => handleRedeem(item)}
                        disabled={!!redeeming || !canAfford}
                        style={({ pressed }) => [
                          styles.redeemButton,
                          !canAfford && styles.redeemButtonDisabled,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        {redeeming === item.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.redeemButtonText}>{canAfford ? "Redeem" : "Need more"}</Text>
                        )}
                      </Pressable>
                    </View>
                  </LinearGradient>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Feather name="gift" size={48} color="#555570" />
                <Text style={styles.emptyText}>No gifts available yet</Text>
                <Text style={styles.emptySubText}>Check back soon for rewards!</Text>
              </View>
            )}
          />
        )
      ) : (
        historyLoading ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={history ?? []}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const statusColor = item.status === "approved" ? "#43E97B" : item.status === "rejected" ? "#EF4444" : "#F59E0B";
              const giftName = item.rewardDetails?.giftName ?? item.rewardType ?? "Gift";
              return (
                <View style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{giftName}</Text>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                    <Text style={styles.historyPoints}>-{item.points} pts</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Feather name="inbox" size={48} color="#555570" />
                <Text style={styles.emptyText}>No redemptions yet</Text>
                <Text style={styles.emptySubText}>Earn points and redeem gifts!</Text>
              </View>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  back: { width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", flex: 1 },
  pointsBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,215,0,0.1)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  pointsText: { color: "#FFD700", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabRow: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "#13131A", borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  tab: { flex: 1, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#6C63FF" },
  tabText: { color: "#555570", fontFamily: "Inter_500Medium", fontSize: 13 },
  tabTextActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  giftCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#2A2A3A" },
  giftGradient: { padding: 16 },
  giftHeader: { flexDirection: "row", gap: 14, marginBottom: 14, alignItems: "flex-start" },
  giftIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  giftName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 4 },
  giftDesc: { fontSize: 13, color: "#8888A8", fontFamily: "Inter_400Regular", lineHeight: 18 },
  giftFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  giftCost: { flexDirection: "row", alignItems: "center", gap: 5 },
  giftCostText: { color: "#FFD700", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  redeemButton: {
    backgroundColor: "#6C63FF", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 80, alignItems: "center",
  },
  redeemButtonDisabled: { backgroundColor: "#2A2A3A" },
  redeemButtonText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  historyCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#13131A", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  historyName: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#fff" },
  historyDate: { fontSize: 11, color: "#555570", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  historyPoints: { fontSize: 14, color: "#EF4444", fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 16 },
  emptySubText: { color: "#3A3A50", fontFamily: "Inter_400Regular", fontSize: 13 },
});
