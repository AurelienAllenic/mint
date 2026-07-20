// @ts-nocheck
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Slot, useSegments } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthProvider } from "../context/auth";
import { usePremiumStatus } from "../utils/getPremiumStatus";
// Note: react-native-google-mobile-ads is native — we require it dynamically
// only when running a built app to avoid crashes in Expo Go.

const EXCLUDED_ROUTES = ["login", "signup", "welcome", "register"];

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat: require("@/assets/fonts/static/Montserrat-Regular.ttf"),
    MontserratBold: require("@/assets/fonts/static/Montserrat-Bold.ttf"),
    MontserratSemiBold: require("@/assets/fonts/static/Montserrat-SemiBold.ttf"),
    MontserratLight: require("@/assets/fonts/static/Montserrat-Light.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <InnerLayout />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function InnerLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const firstSegment = segments && segments.length > 0 ? segments[0] : "";

  const [adUrl, setAdUrl] = useState<string | null>(null);

  const isPremium = usePremiumStatus();

  const isExpoGo = Constants.appOwnership === "expo";
  const isBuilt = !isExpoGo;

  const hideByRoute = EXCLUDED_ROUTES.includes(firstSegment);

  const showAds = !isPremium && !hideByRoute;

  // Gestion des deep links au démarrage de l'app
  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log("🔗 [DeepLink] URL initiale:", initialUrl);
        // Expo Router gère automatiquement les deep links, mais on log pour debug
      }
    };

    handleInitialURL();

    // Écouter les changements d'URL (quand l'app est déjà ouverte)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("🔗 [DeepLink] URL reçue:", event.url);
      // Expo Router gère automatiquement les deep links
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Randomly pick one of the two local images on each load when in Expo Go
  const selectedImageName = useMemo(() => {
    const pick = Math.random() < 0.5 ? 0 : 1;
    // images live in assets/images/
    return pick === 0 ? "IMG_8478.png" : "IMG_8479.png";
    // re-evaluate on each mount / route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstSegment]);

  useEffect(() => {
    if (selectedImageName.includes("IMG_8479")) {
      setAdUrl("https://www.westernunion.com/fr/fr/home.html");
    } else {
      setAdUrl("https://konyks.com/");
    }
  }, [selectedImageName]);

  const expoImage =
    selectedImageName === "IMG_8479.png"
      ? require("../assets/images/IMG_8479.png")
      : require("../assets/images/IMG_8478.png");

  // When built (not Expo Go), dynamically require the native ads module.
  let BuiltAd: React.ReactNode = null;
  if (isBuilt && showAds) {
    try {
      // Dynamically require to avoid loading native module in Expo Go
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mobileAds = require("react-native-google-mobile-ads");
      const { BannerAd, BannerAdSize, TestIds } = mobileAds;
      const unitId =
        typeof __DEV__ !== "undefined" && __DEV
          ? TestIds.BANNER
          : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.BANNER;

      BuiltAd = (
        <BannerAd size={BannerAdSize.ADAPTIVE_BANNER} unitId={unitId} />
      );
    } catch (e) {
      // If require fails, silently fall back to no ad (avoid debug UI)
      BuiltAd = null;
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Slot />

      {showAds && (
        <View style={styles.adWrapper}>
          {isBuilt ? (
            BuiltAd
          ) : (
            <TouchableOpacity
              onPress={() => {
                Linking.openURL(`${adUrl}?utm_source=mint_app`);
              }}
              style={styles.adTouchable}
              activeOpacity={0.8}
            >
              <Image
                source={expoImage}
                style={styles.adImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  adWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  adTouchable: {
    width: "100%",
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  adImage: {
    width: "100%",
    height: 60,
  },
  debugBox: {
    padding: 6,
    backgroundColor: "#fee",
    borderRadius: 6,
  },
  debugText: {
    color: "#900",
    fontSize: 12,
  },
  /* debug styles removed */
});
