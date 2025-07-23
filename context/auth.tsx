import { createContext, useContext, useState } from "react";

type User = {
  email: string;
  name: string;
  id?: number;
  firstname?: string | null;
  lastname?: string | null;
  isConnected: boolean;
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (userData: {
    email: string;
    name?: string;
    token: string;
    isConnected: boolean;
    id?: number;
    firstname?: string | null;
    lastname?: string | null;
  }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (userData: {
    email: string;
    name?: string;
    token: string;
    id?: number;
    firstname?: string | null;
    lastname?: string | null;
  }) => {
    console.log("=== AUTH CONTEXT LOGIN ===");
    console.log("userData received:", userData);

    setUser({
      email: userData.email,
      name:
        userData.name ||
        `${userData.firstname || ""} ${userData.lastname || ""}`.trim(),
      id: userData.id,
      firstname: userData.firstname ?? null,
      lastname: userData.lastname ?? null,
      isConnected: true,
    });
    setToken(userData.token);

    console.log("User set in context:", {
      email: userData.email,
      name:
        userData.name ||
        `${userData.firstname || ""} ${userData.lastname || ""}`.trim(),
      firstname: userData.firstname ?? null,
      lastname: userData.lastname ?? null,
    });
    console.log("=========================");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
