import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Slot, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "../context/auth";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat: require("@/assets/fonts/static/Montserrat-Regular.ttf"),
    MontserratBold: require("@/assets/fonts/static/Montserrat-Bold.ttf"),
    MontserratSemiBold: require("@/assets/fonts/static/Montserrat-SemiBold.ttf"),
    MontserratLight: require("@/assets/fonts/static/Montserrat-Light.ttf"),
  });
  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
  );
}

function InnerLayout() {
  const [AdMobBannerComp, setAdMobBannerComp] = useState<any | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const segments = useSegments();
  // choose the most relevant segment: last non-group, non-index segment
  const relevantSegment =
    [...segments].reverse().find((s) => !s.startsWith("(") && s !== "index") ||
    "";
  const excluded = ["welcome", "login", "signup"];
  const showBannerRoute = !excluded.includes(relevantSegment);

  const { token } = useAuth();
  // show banner only if route allows AND user is not premium (isPremium === false)
  const showBanner = showBannerRoute && isPremium !== true;

  useEffect(() => {
    if (Constants.appOwnership === "expo") return;

    let mounted = true;
    (async () => {
      try {
        const mod = await import("expo-ads-admob");
        if (mounted && mod?.AdMobBanner) {
          setAdMobBannerComp(() => mod.AdMobBanner);
        }
      } catch (e) {
        console.warn("expo-ads-admob unavailable:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!token) {
        // no token: assume not premium (guest) so keep banner shown
        setIsPremium(false);
        return;
      }

      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        if (!API_URL) return;

        const authHeader = token.startsWith("Bearer ")
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
          const data = await response.json();
          setIsPremium(Boolean(data.isPremium));
        }
      } catch (err) {
        console.warn("Failed to check premium status:", err);
      }
    };

    checkPremiumStatus();
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>

      {showBanner && (
        <View style={styles.bannerContainer} pointerEvents="box-none">
          {AdMobBannerComp ? (
            // @ts-ignore: AdMobBanner props
            <AdMobBannerComp
              bannerSize="smartBannerPortrait"
              adUnitID={`${process.env.EXPO_PUBLIC_ADMOB_TEST_APP_ID}`}
              servePersonalizedAds
              onDidFailToReceiveAdWithError={(err: any) => console.log(err)}
            />
          ) : (
            <Text style={styles.devText}>
              Bannière désactivée en environnement de développement (Expo Go).
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10120fff" },
  content: { flex: 1, paddingBottom: 40 },
  bannerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: "center",
    paddingVertical: 8,
  },
  devText: { color: "#fff", fontSize: 12 },
});
