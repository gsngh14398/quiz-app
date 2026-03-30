import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WebView = Platform.OS === "web"
  ? null
  : require("react-native-webview").WebView;

function toPreviewUrl(url: string): string {
  if (!url) return url;
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    if (url.includes("/edit")) return url.replace("/edit", "/preview");
    if (url.includes("/view")) return url.replace("/view", "/preview");
  }
  return url;
}

export default function NoteViewer() {
  const { title, pdfUrl } = useLocalSearchParams<{ title: string; pdfUrl: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<any>(null);

  const previewUrl = toPreviewUrl(pdfUrl ?? "");

  const handleShare = async () => {
    try {
      await Share.share({ message: `${title ?? "Study Note"}: ${pdfUrl}`, url: pdfUrl });
    } catch {}
  };

  const handleOpenExternal = async () => {
    if (pdfUrl) await Linking.openURL(pdfUrl);
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>{title ?? "Study Note"}</Text>

        <View style={styles.headerActions}>
          {Platform.OS !== "web" && (
            <Pressable onPress={handleShare} style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Feather name="share-2" size={20} color="#fff" />
            </Pressable>
          )}
          <Pressable onPress={handleOpenExternal} style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Feather name="external-link" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Viewer */}
      <View style={styles.webviewContainer}>
        {previewUrl ? (
          Platform.OS === "web" ? (
            /* Web: use native iframe */
            <iframe
              src={previewUrl}
              style={{ flex: 1, width: "100%", height: "100%", border: "none", backgroundColor: "#0A0A0F" } as any}
              title={title ?? "Study Note"}
            />
          ) : (
            /* Native: use WebView */
            <>
              <WebView
                ref={webViewRef}
                source={{ uri: previewUrl }}
                style={styles.webview}
                onLoadStart={() => { setLoading(true); setError(false); }}
                onLoadEnd={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
              />
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#6C63FF" />
                  <Text style={styles.loadingText}>Loading PDF...</Text>
                </View>
              )}
              {error && (
                <View style={styles.errorOverlay}>
                  <Feather name="alert-circle" size={48} color="#EF4444" />
                  <Text style={styles.errorTitle}>Could not load PDF</Text>
                  <Text style={styles.errorSub}>Try opening it externally</Text>
                  <Pressable onPress={handleOpenExternal} style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}>
                    <Feather name="external-link" size={16} color="#fff" />
                    <Text style={styles.openBtnText}>Open in Browser</Text>
                  </Pressable>
                </View>
              )}
            </>
          )
        ) : (
          <View style={styles.errorOverlay}>
            <Feather name="file-text" size={48} color="#555570" />
            <Text style={styles.errorTitle}>No PDF attached</Text>
            <Text style={styles.errorSub}>This note has no PDF link</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#13131A",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A3A",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  headerActions: { flexDirection: "row", gap: 6 },

  webviewContainer: { flex: 1, position: "relative" },
  webview: { flex: 1, backgroundColor: "#0A0A0F" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "#8888A8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginTop: 4,
  },
  errorSub: {
    color: "#8888A8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  openBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
