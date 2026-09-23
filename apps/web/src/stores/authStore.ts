import type { PublicUser } from "@jobpilot/shared";
import { create } from "zustand";

interface AuthState {
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
}

/**
 * The API is the source of truth for session state (httpOnly cookie);
 * this store only mirrors the currently-known user so components don't
 * all need to depend on TanStack Query directly. See hooks/useAuth.ts,
 * which is the only place that should call setUser.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
