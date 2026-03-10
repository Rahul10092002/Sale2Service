import { useAuth as useAuthHook } from "../features/auth/hooks.js";

/**
 * Re-export useAuth hook for easier importing
 * This allows components to import useAuth from hooks/ folder
 */
export const useAuth = useAuthHook;

// Re-export for backwards compatibility
export { useCurrentUser } from "../features/auth/hooks.js";
