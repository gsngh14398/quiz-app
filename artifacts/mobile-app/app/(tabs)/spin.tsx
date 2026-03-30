import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Easing, Platform,
  Pressable, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIZES = [
  { label: "5 pts", points: 5, color: "#6C63FF" },
  { label: "10 pts", points: 10, color: "#FF6584" },
  { label: "20 pts", points: 20, color: "#43E97B" },
  { label: "50 pts", points: 50, color: "#F093FB" },
  { label: "5 pts", points: 5, color: "#4FACFE" },
  { label: "15 pts", points: 15, color: "#FA709A" },
  { label: "30 pts", points: 30, color: "#30CFD0" },
  { label: "100 pts", points: 100, color: "#A18CD1" },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;
const WHEEL_SIZE = 300;
const RADIUS = WHEEL_SIZE / 2;

export default function SpinScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof PRIZES[0] | null>(null);

  const { data: canSpin } = useQuery({
    queryKey: ["canSpin"],
    queryFn: async () => {
      const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/spin/can-spin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const handleSpin = async () => {
    if (spinning) return;
    if (!canSpin?.canSpin) {
      Alert.alert("Come back tomorrow!", `Next spin available in ${canSpin?.hoursUntilNextSpin?.toFixed(0) ?? "?"} hours`);
      return;
    }
    setSpinning(true);
    setResult(null);

    const token = await import("@react-native-async-storage/async-storage").then(m => m.default.getItem("quiz_token"));
    let spinData: any;
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/spin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      spinData = await res.json();
      if (!res.ok) throw new Error(spinData.error || "Spin failed");
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setSpinning(false);
      return;
    }

    const prizePoints = spinData.points as number;
    const prizeIndex = PRIZES.findIndex(p => p.points === prizePoints) ?? 0;
    const targetAngle = 360 * 8 - (prizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const totalRotation = currentRotation.current + targetAngle;
    currentRotation.current = totalRotation % 360;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.timing(spinValue, {
      toValue: totalRotation,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setResult(PRIZES[prizeIndex >= 0 ? prizeIndex : 0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["canSpin"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    });
  };

  const rotate = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Lucky Spin</Text>
      <Text style={styles.subtitle}>Spin once a day to earn bonus points</Text>

      <View style={styles.wheelContainer}>
        <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}>
          {PRIZES.map((prize, i) => {
            const angle = i * SEGMENT_ANGLE;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: "transparent",
                  },
                ]}
              >
                <LinearGradient
                  colors={[prize.color, prize.color + "CC"]}
                  style={styles.segmentInner}
                >
                  <Text style={styles.segmentLabel}>{prize.label}</Text>
                </LinearGradient>
              </View>
            );
          })}
          <View style={styles.wheelCenter}>
            <LinearGradient colors={["#1C1C27", "#0A0A0F"]} style={styles.wheelCenterInner}>
              <Feather name="zap" size={24} color="#6C63FF" />
            </LinearGradient>
          </View>
        </Animated.View>
        <View style={styles.pointer} />
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>You won!</Text>
          <Text style={styles.resultPoints}>{result.points} Points</Text>
        </View>
      )}

      <Pressable
        onPress={handleSpin}
        disabled={spinning}
        style={({ pressed }) => [styles.spinButton, { opacity: pressed || spinning ? 0.8 : 1 }]}
      >
        <LinearGradient colors={["#6C63FF", "#8B85FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.spinGradient}>
          {spinning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="refresh-cw" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.spinText}>
                {canSpin?.canSpin === false ? "Already spun today" : "Spin the Wheel!"}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {canSpin?.canSpin === false && (
        <Text style={styles.nextSpin}>
          Next spin in {canSpin?.hoursUntilNextSpin?.toFixed(0) ?? "?"} hours
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#8888A8", fontFamily: "Inter_400Regular", marginBottom: 32 },
  wheelContainer: { width: WHEEL_SIZE + 20, height: WHEEL_SIZE + 20, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  wheel: {
    width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: RADIUS,
    overflow: "hidden", borderWidth: 4, borderColor: "#2A2A3A",
  },
  segment: {
    position: "absolute", width: WHEEL_SIZE / 2, height: WHEEL_SIZE,
    left: WHEEL_SIZE / 2, top: 0,
    transformOrigin: "0% 50%",
  },
  segmentInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  segmentLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", transform: [{ rotate: "90deg" }] },
  wheelCenter: {
    position: "absolute", width: 70, height: 70, borderRadius: 35,
    alignSelf: "center", top: WHEEL_SIZE / 2 - 35, left: WHEEL_SIZE / 2 - 35,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10,
  },
  wheelCenterInner: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#2A2A3A" },
  pointer: {
    position: "absolute", top: 0,
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 24,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: "#6C63FF",
  },
  resultCard: {
    alignItems: "center", backgroundColor: "#13131A", borderRadius: 20,
    padding: 20, marginBottom: 20, width: "100%",
    borderWidth: 1, borderColor: "rgba(108,99,255,0.4)",
  },
  resultEmoji: { fontSize: 36, marginBottom: 4 },
  resultTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff" },
  resultPoints: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#8B85FF", marginTop: 4 },
  spinButton: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  spinGradient: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  spinText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  nextSpin: { marginTop: 12, color: "#8888A8", fontFamily: "Inter_400Regular", fontSize: 13 },
});
