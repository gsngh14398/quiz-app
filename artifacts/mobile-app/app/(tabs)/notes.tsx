import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Screen = "subjects" | "subcategories" | "notes";

interface Category { id: string; name: string; color?: string; icon?: string; questionCount?: number; }
interface Subcategory { id: string; name: string; categoryId: string; description?: string; }
interface Note {
  id: string; title: string; description?: string; content?: string;
  pdfUrl?: string; categoryId?: string; subcategoryId?: string;
  categoryName?: string; subcategoryName?: string; active: boolean;
}

const CAT_COLORS = [
  ["#6C63FF", "#4F47CC"],
  ["#FF6B6B", "#E85555"],
  ["#11D49A", "#0CA87A"],
  ["#FFB347", "#E09030"],
  ["#4ECDC4", "#38A8A0"],
  ["#A29BFE", "#7C73E6"],
];

function getPreviewUrl(url: string): string {
  if (!url) return url;
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
    if (url.includes("/edit")) return url.replace("/edit", "/view");
  }
  return url;
}

async function getToken() {
  return AsyncStorage.getItem("quiz_token");
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("subjects");
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSubcat, setSelectedSubcat] = useState<Subcategory | null>(null);
  const [search, setSearch] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: categories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ["notes-subjects"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const { data: subcategories = [], isLoading: subcatLoading } = useQuery<Subcategory[]>({
    queryKey: ["notes-subcats", selectedCat?.id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/subcategories?categoryId=${selectedCat!.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!selectedCat && screen === "subcategories",
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["notes-list", selectedSubcat?.id, selectedCat?.id],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (selectedSubcat) params.set("subcategoryId", selectedSubcat.id);
      else if (selectedCat) params.set("categoryId", selectedCat.id);
      const res = await fetch(`${BASE}/api/notes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: screen === "notes",
  });

  const filteredNotes = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.description && n.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openNote = (note: Note) => {
    if (note.pdfUrl) {
      router.push({ pathname: "/note-viewer", params: { title: note.title, pdfUrl: note.pdfUrl } });
    }
  };

  const goBack = () => {
    if (screen === "notes") {
      setScreen("subcategories");
      setSelectedSubcat(null);
      setSearch("");
    } else if (screen === "subcategories") {
      setScreen("subjects");
      setSelectedCat(null);
    }
  };

  const renderBreadcrumb = () => {
    if (screen === "subjects") return null;
    return (
      <Pressable onPress={goBack} style={styles.breadcrumb}>
        <Feather name="arrow-left" size={16} color="#8888A8" />
        <Text style={styles.breadcrumbText}>
          {screen === "subcategories" ? "Subjects" : selectedCat?.name}
        </Text>
        {screen === "notes" && selectedSubcat && (
          <>
            <Feather name="chevron-right" size={14} color="#555570" />
            <Text style={[styles.breadcrumbText, { color: "#fff" }]}>{selectedSubcat.name}</Text>
          </>
        )}
      </Pressable>
    );
  };

  const isLoading = catLoading || subcatLoading || notesLoading;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        {renderBreadcrumb()}
        <Text style={styles.title}>
          {screen === "subjects" ? "Study Notes" : screen === "subcategories" ? selectedCat?.name : selectedSubcat?.name || selectedCat?.name}
        </Text>
        <Text style={styles.subtitle}>
          {screen === "subjects" ? "Choose a subject to explore" : screen === "subcategories" ? "Select a subcategory" : "Browse your notes"}
        </Text>

        {screen === "notes" && (
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#555570" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notes..."
              placeholderTextColor="#555570"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginTop: 60 }} size="large" />
      ) : screen === "subjects" ? (
        /* ── SUBJECTS ── */
        <FlatList
          key="subjects-grid"
          data={categories}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => {
            const [c1, c2] = CAT_COLORS[index % CAT_COLORS.length];
            return (
              <Pressable style={({ pressed }) => [styles.subjectCard, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => { setSelectedCat(item); setScreen("subcategories"); }}>
                <LinearGradient colors={[c1, c2]} style={styles.subjectGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.subjectIcon}>
                    <Feather name="book" size={22} color="#fff" />
                  </View>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  <View style={styles.subjectArrow}>
                    <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                </LinearGradient>
              </Pressable>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="book-open" size={48} color="#555570" />
              <Text style={styles.emptyText}>No subjects found</Text>
            </View>
          )}
        />
      ) : screen === "subcategories" ? (
        /* ── SUBCATEGORIES ── */
        <FlatList
          key="subcategories-list"
          data={subcategories}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.subcatCard, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => { setSelectedSubcat(item); setScreen("notes"); }}>
              <View style={styles.subcatIcon}>
                <Feather name="folder" size={20} color="#6C63FF" />
              </View>
              <View style={styles.subcatText}>
                <Text style={styles.subcatName}>{item.name}</Text>
                {item.description && <Text style={styles.subcatDesc}>{item.description}</Text>}
              </View>
              <Feather name="chevron-right" size={18} color="#555570" />
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="folder" size={48} color="#555570" />
              <Text style={styles.emptyText}>No subcategories yet</Text>
              <Text style={styles.emptyHint}>Check back later</Text>
            </View>
          )}
        />
      ) : (
        /* ── NOTES LIST ── */
        <FlatList
          key="notes-list"
          data={filteredNotes}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.noteCard, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => openNote(item)}>
              <View style={styles.noteLeft}>
                <View style={[styles.noteIcon, { backgroundColor: item.pdfUrl ? "rgba(239,68,68,0.12)" : "rgba(108,99,255,0.12)" }]}>
                  <Feather name={item.pdfUrl ? "file-text" : "file"} size={20} color={item.pdfUrl ? "#EF4444" : "#6C63FF"} />
                </View>
                <View style={styles.noteText}>
                  <Text style={styles.noteTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.noteDesc} numberOfLines={2}>{item.description}</Text>
                  ) : item.content ? (
                    <Text style={styles.noteDesc} numberOfLines={2}>{item.content}</Text>
                  ) : null}
                  {item.pdfUrl ? (
                    <View style={styles.pdfBadge}>
                      <Feather name="link" size={10} color="#EF4444" />
                      <Text style={styles.pdfBadgeText}>Tap to open PDF</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Feather name="chevron-right" size={16} color="#555570" />
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="book" size={48} color="#555570" />
              <Text style={styles.emptyText}>{search ? "No matching notes" : "No notes yet"}</Text>
              <Text style={styles.emptyHint}>Notes will appear here when added</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4 },
  breadcrumbText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8888A8" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8888A8", marginBottom: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#13131A",
    borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: "#2A2A3A",
  },
  searchInput: { flex: 1, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15 },

  grid: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  row: { gap: 12, justifyContent: "space-between" },
  subjectCard: { flex: 1, borderRadius: 18, overflow: "hidden" },
  subjectGradient: { padding: 20, minHeight: 130, justifyContent: "space-between" },
  subjectIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  subjectName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", flex: 1 },
  subjectArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", alignSelf: "flex-end",
  },

  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 10 },
  subcatCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#13131A", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  subcatIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(108,99,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  subcatText: { flex: 1 },
  subcatName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  subcatDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8888A8", marginTop: 2 },

  noteCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#13131A", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#2A2A3A",
  },
  noteLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  noteIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  noteText: { flex: 1 },
  noteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 2 },
  noteDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8888A8", lineHeight: 18 },
  pdfBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
    backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: "flex-start",
  },
  pdfBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#EF4444" },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { color: "#8888A8", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  emptyHint: { color: "#555570", fontFamily: "Inter_400Regular", fontSize: 13 },
});
