import { useState, useEffect } from "react";

/**
 * Custom hook for managing dark mode state
 * Persists the dark mode preference in localStorage and applies it to the document
 */
export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") return false;

    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Default to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Ensure we're in browser environment
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Debug log with more information
    console.log("🌙 Dark mode toggled:", isDarkMode ? "🌙 DARK" : "☀️ LIGHT");
    console.log("📋 Root classes:", root.classList.toString());
    console.log("🎨 Dark mode should be", isDarkMode ? "ACTIVE" : "INACTIVE");
  }, [isDarkMode]);

  // Initialize dark mode on mount
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const savedTheme = localStorage.getItem("theme");

    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    console.log("🚀 Dark mode initialized:", {
      savedTheme,
      systemPreference: window.matchMedia("(prefers-color-scheme: dark)")
        .matches,
      finalState: root.classList.contains("dark") ? "DARK" : "LIGHT",
      rootClasses: root.classList.toString(),
    });
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return {
    isDarkMode,
    toggleDarkMode,
  };
};
