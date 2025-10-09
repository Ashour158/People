import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">HR Mobile App - Login</Text>
      <Text>Login screen implementation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});

export default LoginScreen;
