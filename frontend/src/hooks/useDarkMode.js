/**
 * Light-mode only stub for useDarkMode
 * Returns a stable API but disables dark-mode toggling.
 */
export const useDarkMode = () => {
  const isDarkMode = false;
  const toggleDarkMode = () => {
    // no-op - dark mode removed, app runs in light mode only
    return;
  };

  return { isDarkMode, toggleDarkMode };
};
