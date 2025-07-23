import React from "react";
import { Image, StyleSheet } from "react-native";

const PulseMarker: React.FC = () => {
  return (
    <Image
      source={require("@/assets/images/pointer.png")}
      style={styles.pointer}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  pointer: {
    width: 32,
    height: 32,
  },
});

export default PulseMarker;
