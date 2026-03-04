import { createContext, useCallback, useContext, useState } from "react";

const STORAGE_KEY = "scene-editor-auth";

type AuthState = {
  username: string;
} | null;

type AuthContextValue = {
  user: AuthState;
  isEditor: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): AuthState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "username" in parsed && typeof (parsed as Record<string, unknown>).username === "string") {
      return { username: (parsed as { username: string }).username };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState>(() => readStoredAuth());

  const login = useCallback((username: string, password: string): boolean => {
    const validUsername = (import.meta.env.VITE_EDITOR_USERNAME as string | undefined)?.trim() || "admin";
    const validPassword = (import.meta.env.VITE_EDITOR_PASSWORD as string | undefined)?.trim() || "t3private";
    if (username.trim() === validUsername && password === validPassword) {
      const authState: AuthState = { username: username.trim() };
      setUser(authState);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
      return true;
    }
    return false;
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
