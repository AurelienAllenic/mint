import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { AuthProvider } from "../context/auth";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat: require("@/assets/fonts/static/Montserrat-Regular.ttf"),
    MontserratBold: require("@/assets/fonts/static/Montserrat-Bold.ttf"),
    MontserratSemiBold: require("@/assets/fonts/static/Montserrat-SemiBold.ttf"),
    MontserratLight: require("@/assets/fonts/static/Montserrat-Light.ttf"),
    // Ajoute les autres variantes si besoin
  });
  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
