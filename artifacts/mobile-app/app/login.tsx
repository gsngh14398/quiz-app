import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0A0A0F", "#13131A", "#0A0A0F"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <LinearGradient colors={["#6C63FF", "#8B85FF"]} style={styles.logoContainer}>
              <Feather name="zap" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>Quiz Elite</Text>
            <Text style={styles.subtitle}>Challenge yourself daily</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome back</Text>

            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#6C63FF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#555570"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#6C63FF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#555570"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#555570" />
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [styles.loginButton, { opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient colors={["#6C63FF", "#8B85FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() => router.push("/register")}
              style={({ pressed }) => [styles.registerButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.registerText}>Create an account</Text>
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
  header: { alignItems: "center", marginBottom: 48 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16, shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 },
  subtitle: { fontSize: 15, color: "#8888A8", marginTop: 4, fontFamily: "Inter_400Regular" },
  form: {
    backgroundColor: "#13131A", borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  formTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 24 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0A0A0F", borderRadius: 14, borderWidth: 1,
    borderColor: "#2A2A3A", marginBottom: 14, paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_400Regular" },
  eyeButton: { padding: 4 },
  loginButton: { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  loginGradient: { height: 52, alignItems: "center", justifyContent: "center" },
  loginText: { color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#2A2A3A" },
  dividerText: { color: "#555570", marginHorizontal: 12, fontFamily: "Inter_400Regular" },
  registerButton: {
    height: 52, borderRadius: 14, borderWidth: 1,
    borderColor: "#6C63FF", alignItems: "center", justifyContent: "center",
  },
  registerText: { color: "#6C63FF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
