import { createContext, useContext, useState } from "react";

type User = {
  email: string;
  name: string;
  id?: number;
  firstname?: string | null;
  lastname?: string | null;
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (userData: { email: string; name: string; token: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (userData: {
    email: string;
    name: string;
    token: string;
    id?: number;
    firstname?: string | null;
    lastname?: string | null;
  }) => {
    setUser({ email: userData.email, name: userData.name });
    setToken(userData.token);
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
