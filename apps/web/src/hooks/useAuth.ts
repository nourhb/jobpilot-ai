import type { LoginInput, RegisterInput } from "@jobpilot/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";
import { ApiError } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

/**
 * Bootstraps session state on load by calling GET /api/auth/me. A 401
 * simply means "not logged in" -- not an error worth surfacing.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      try {
        const { user } = await authService.me();
        setUser(user);
        return user;
      } catch (error) {
        setUser(null);
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    },
  });
}
