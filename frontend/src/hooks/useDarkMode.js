import { useState, useEffect, useCallback } from 'react';

/**
 * useDarkMode — Tailwind v4 class-based dark mode hook
 *
 * Reads initial state from localStorage or system preference.
 * Toggles the 'dark' class on <html>, updates theme-color meta, and persists.
 */
export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return (
        typeof window !== 'undefined' &&
        (document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDarkMode);
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

      // Update mobile browser chrome theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDarkMode ? '#0b0f19' : '#f8fafc');
      }
    } catch (_) {}
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return { isDarkMode, toggleDarkMode };
};
