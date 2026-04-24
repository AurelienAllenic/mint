import { createContext, useContext, useState } from "react";
import type { RunnerSponsor } from "../types/api";

type User = {
  email: string;
  name: string;
  _id?: string;
  firstname?: string | null;
  lastname?: string | null;
  profileImage?: string | null;
  role?: "visitor" | "coureur" | "organisateur";
  isConnected: boolean;
  isVisitor?: boolean;
  runnerSponsor?: RunnerSponsor;
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
    role?: "visitor" | "coureur" | "organisateur";
    isVisitor?: boolean;
    runnerSponsor?: RunnerSponsor;
  }) => void;
  logout: () => void;
  updateUser: (userData: {
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
    runnerSponsor?: RunnerSponsor;
    role?: "visitor" | "coureur" | "organisateur";
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
    role?: "visitor" | "coureur" | "organisateur";
    isVisitor?: boolean;
    runnerSponsor?: RunnerSponsor;
  }) => {
    setUser({
      email: userData.email,
      name:
        userData.name ||
        `${userData.firstname || ""} ${userData.lastname || ""}`.trim(),
      _id: userData._id,
      firstname: userData.firstname ?? null,
      lastname: userData.lastname ?? null,
      profileImage: userData.profileImage ?? null,
      role: userData.role,
      isConnected: true,
      isVisitor: userData.isVisitor || false,
      runnerSponsor: userData.runnerSponsor ?? null,
    });
    setToken(userData.token);
  };

  const updateUser = (updatedData: {
    firstname?: string | null;
    lastname?: string | null;
    profileImage?: string | null;
    runnerSponsor?: RunnerSponsor;
    role?: "visitor" | "coureur" | "organisateur";
  }) => {
    if (!user) return;

    const nextFirst =
      updatedData.firstname !== undefined
        ? updatedData.firstname
        : user.firstname;
    const nextLast =
      updatedData.lastname !== undefined ? updatedData.lastname : user.lastname;

    const updatedUser: User = {
      ...user,
      ...(updatedData.firstname !== undefined && {
        firstname: updatedData.firstname,
      }),
      ...(updatedData.lastname !== undefined && {
        lastname: updatedData.lastname,
      }),
      ...(updatedData.profileImage !== undefined && {
        profileImage: updatedData.profileImage,
      }),
      ...(updatedData.runnerSponsor !== undefined && {
        runnerSponsor: updatedData.runnerSponsor,
      }),
      ...(updatedData.role !== undefined && { role: updatedData.role }),
      name: `${nextFirst || ""} ${nextLast || ""}`.trim(),
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

        // Mettre à jour le contexte avec les données fraîches
        updateUser({
          firstname: profileData.firstname,
          lastname: profileData.lastname,
          profileImage: profileData.profileImage,
          runnerSponsor: profileData.runnerSponsor ?? null,
          role: profileData.role,
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors du rafraîchissement des données utilisateur:",
        error,
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
