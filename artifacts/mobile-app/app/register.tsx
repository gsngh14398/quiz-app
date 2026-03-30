import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, referralCode: referralCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Registration Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#13131A", "#0A0A0F"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={[styles.back, { marginBottom: 24 }]}>
            <Feather name="arrow-left" size={22} color="#8888A8" />
          </Pressable>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Join Quiz Elite and start earning points</Text>

            {[
              { label: "Full Name", icon: "user", value: name, setter: setName, placeholder: "Your full name" },
              { label: "Email", icon: "mail", value: email, setter: setEmail, placeholder: "Email address", keyboard: "email-address", autoCapitalize: "none" },
            ].map(({ icon, value, setter, placeholder, keyboard, autoCapitalize }: any) => (
              <View key={icon} style={styles.inputWrapper}>
                <Feather name={icon} size={18} color="#6C63FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#555570"
                  value={value}
                  onChangeText={setter}
                  keyboardType={keyboard}
                  autoCapitalize={autoCapitalize || "words"}
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#6C63FF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password (min 6 chars)"
                placeholderTextColor="#555570"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#555570" />
              </Pressable>
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="gift" size={18} color="#6C63FF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Referral code (optional)"
                placeholderTextColor="#555570"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [styles.submitButton, { opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient colors={["#6C63FF", "#8B85FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backToLogin, { opacity: pressed ? 0.8 : 1 }]}>
              <Text style={styles.backToLoginText}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  back: { width: 40, height: 40, justifyContent: "center" },
  form: {
    backgroundColor: "#13131A", borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  formTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 6 },
  formSubtitle: { fontSize: 14, color: "#8888A8", marginBottom: 24, fontFamily: "Inter_400Regular" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0A0A0F", borderRadius: 14, borderWidth: 1,
    borderColor: "#2A2A3A", marginBottom: 14, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_400Regular" },
  eyeButton: { padding: 4 },
  submitButton: { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  submitGradient: { height: 52, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  backToLogin: { marginTop: 16, alignItems: "center" },
  backToLoginText: { color: "#6C63FF", fontSize: 15, fontFamily: "Inter_500Medium" },
});
