import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AIChatView } from '../../components/AIChatView';

export default function AIChatTabScreen() {
  return (
    <View style={styles.container}>
      <AIChatView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F6F5EF',
  },
});
