import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const LeaveScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Leave Management</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});

export default LeaveScreen;
