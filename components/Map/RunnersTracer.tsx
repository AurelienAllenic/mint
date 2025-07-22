import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

// Chargement statique, pas besoin d'useEffect ni d'useState
const runners: Array<{
  email: string;
  name: string;
  latitude: number;
  longitude: number;
}> = require("../../data/runners.json");

export default function RunnersTracer() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {runners.map((runner, idx) => (
          <Marker
            key={runner.email}
            coordinate={{
              latitude: runner.latitude,
              longitude: runner.longitude,
            }}
          >
            <Callout>
              <Text>{runner.name}</Text>
              <Text>{runner.email}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
