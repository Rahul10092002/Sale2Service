import { useState, useEffect } from 'react';

/**
 * useDarkMode — Tailwind v4 class-based dark mode hook
 *
 * Reads initial state from localStorage ('dark' | 'light').
 * Toggles the 'dark' class on <html> and persists to localStorage.
 */
export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return { isDarkMode, toggleDarkMode };
};
