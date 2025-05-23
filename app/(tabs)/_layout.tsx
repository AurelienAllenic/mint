import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../context/auth";

export default function TabsLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}
