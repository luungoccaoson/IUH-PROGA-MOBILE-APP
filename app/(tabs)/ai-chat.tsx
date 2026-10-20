import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AIChatView } from '../../components/AIChatView';
import { useThemeStore } from '../../stores/useThemeStore';

export default function AIChatTabScreen() {
  const { colors } = useThemeStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <AIChatView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
});
