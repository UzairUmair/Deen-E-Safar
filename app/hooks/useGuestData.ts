"use client";
// React bindings for the guest stores. Components read and write guest data only through these.
import { useSyncExternalStore } from "react";
import { bookmarkStore, toggleDuaBookmark, toggleVerseBookmark } from "../services/guest/bookmarkStorage";
import type { Store } from "../services/guest/guestStorage";
import { preferencesStore } from "../services/guest/preferencesStorage";
import { readingProgressStore, recentStore } from "../services/guest/readingProgressStorage";

export function useGuestStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}

export const useGuestPreferences = () => useGuestStore(preferencesStore);
export const useReadingProgress = () => useGuestStore(readingProgressStore);
export const useRecentContent = () => useGuestStore(recentStore);

export function useBookmarks() {
  const bookmarks = useGuestStore(bookmarkStore);
  return {
    ...bookmarks,
    isVerseBookmarked: (surah: number, ayah: number) => bookmarks.quran.some((b) => b.surah === surah && b.ayah === ayah),
    isDuaBookmarked: (id: string) => bookmarks.duas.some((b) => b.id === id),
    toggleVerse: toggleVerseBookmark,
    toggleDua: toggleDuaBookmark,
  };
}
