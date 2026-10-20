import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/useAuthStore';

interface JiraHeaderProps {
  title?: string;
  renderCenter?: () => React.ReactNode;
  rightActions?: React.ReactNode;
}

export function JiraHeader({ title, renderCenter, rightActions }: JiraHeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const userInitials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'TK';

  const handleOpenProfile = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftRow}>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={handleOpenProfile}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{userInitials}</Text>
        </TouchableOpacity>

        {title && <Text style={styles.headerTitle}>{title}</Text>}
      </View>

      {renderCenter && <View style={styles.centerContainer}>{renderCenter()}</View>}

      <View style={styles.rightActionsRow}>
        {rightActions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    backgroundColor: '#101214',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2127',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#5E4DB2', // Jira purple avatar
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#E6EDF3',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
