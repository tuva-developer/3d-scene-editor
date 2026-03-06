import { createContext, useCallback, useContext, useState } from "react";
import { authService } from "@/services/authService";

const STORAGE_KEY = "scene-editor-auth";

type AuthState = {
  externalId: string;
  username: string;
} | null;

type AuthContextValue = {
  user: AuthState;
  isEditor: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): AuthState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "username" in parsed &&
      "externalId" in parsed &&
      typeof (parsed as Record<string, unknown>).username === "string" &&
      typeof (parsed as Record<string, unknown>).externalId === "string"
    ) {
      return {
        username: (parsed as { username: string }).username,
        externalId: (parsed as { externalId: string }).externalId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState>(() => readStoredAuth());

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await authService.login(username, password);
      const externalId = data.user?.externalId?.trim();
      const nextUsername = data.user?.username?.trim();
      if (!externalId || !nextUsername) {
        return false;
      }
      const authState: AuthState = { externalId, username: nextUsername };
      setUser(authState);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isEditor: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
