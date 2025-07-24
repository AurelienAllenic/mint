import { createContext, useContext, useState } from "react";

type User = {
  email: string;
  name: string;
  _id?: string;
  firstname?: string | null;
  lastname?: string | null;
  profileImage?: string | null;
  isConnected: boolean;
  isVisitor?: boolean;
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (userData: {
    email: string;
    name?: string;
    token: string;
    isConnected: boolean;
    _id?: string;
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
    isVisitor?: boolean;
  }) => void;
  logout: () => void;
  updateUser: (userData: {
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
  }) => void;
  refreshUserData: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (userData: {
    email: string;
    name?: string;
    token: string;
    _id?: string;
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
    isVisitor?: boolean;
  }) => {
    console.log("=== AUTH CONTEXT LOGIN ===");
    console.log("userData received:", userData);

    setUser({
      email: userData.email,
      name:
        userData.name ||
        `${userData.firstname || ""} ${userData.lastname || ""}`.trim(),
      _id: userData._id,
      firstname: userData.firstname ?? null,
      lastname: userData.lastname ?? null,
      profileImage: userData.profileImage ?? null,
      isConnected: true,
      isVisitor: userData.isVisitor || false,
    });
    setToken(userData.token);

    console.log("User set in context:", {
      email: userData.email,
      name:
        userData.name ||
        `${userData.firstname || ""} ${userData.lastname || ""}`.trim(),
      _id: userData._id,
      firstname: userData.firstname ?? null,
      lastname: userData.lastname ?? null,
      profileImage: userData.profileImage ?? null,
    });
    console.log("=========================");
  };

  const updateUser = (updatedData: {
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
  }) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updatedData,
      name: `${updatedData.firstname || user.firstname || ""} ${
        updatedData.lastname || user.lastname || ""
      }`.trim(),
    };

    setUser(updatedUser);
  };

  const refreshUserData = async () => {
    if (!token || !user || user.isVisitor) return;

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      if (!API_URL) return;

      const authHeader = token?.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const profileData = await response.json();
        console.log("Refreshed user data:", profileData);

        // Mettre à jour le contexte avec les données fraîches
        updateUser({
          firstname: profileData.firstname,
          lastname: profileData.lastname,
          profileImage: profileData.profileImage,
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors du rafraîchissement des données utilisateur:",
        error
      );
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
