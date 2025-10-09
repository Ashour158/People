import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const DashboardScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Dashboard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});

export default DashboardScreen;
