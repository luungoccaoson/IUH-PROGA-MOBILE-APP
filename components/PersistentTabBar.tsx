import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  JiraHomeIcon,
  JiraPlanetIcon,
  JiraWorkIcon,
  JiraBoardIcon,
  JiraBellIcon,
  JiraUserIcon,
} from './jira/JiraIcons';
import { useThemeStore } from '../stores/useThemeStore';

interface PersistentTabBarProps {
  activeTab?: 'index' | 'spaces' | 'tasks' | 'dashboard' | 'notifications' | 'profile';
}

export const PersistentTabBar: React.FC<PersistentTabBarProps> = ({
  activeTab = 'spaces',
}) => {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { t } = useTranslation();

  const tabs: {
    key: PersistentTabBarProps['activeTab'];
    label: string;
    route: string;
    Icon: React.FC<{ size?: number; color?: string }>;
  }[] = [
    {
      key: 'index',
      label: t("Trang chủ"),
      route: '/(tabs)',
      Icon: JiraHomeIcon,
    },
    {
      key: 'spaces',
      label: t("Không gian"),
      route: '/(tabs)/spaces',
      Icon: JiraPlanetIcon,
    },
    {
      key: 'tasks',
      label: t("Tất cả công việc"),
      route: '/(tabs)/tasks',
      Icon: JiraWorkIcon,
    },
    {
      key: 'dashboard',
      label: t("Bảng thông tin"),
      route: '/(tabs)/dashboard',
      Icon: JiraBoardIcon,
    },
    {
      key: 'notifications',
      label: t("Thông báo"),
      route: '/(tabs)/notifications',
      Icon: JiraBellIcon,
    },
    {
      key: 'profile',
      label: t("Hồ sơ"),
      route: '/(tabs)/profile',
      Icon: JiraUserIcon,
    },
  ];

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.cardBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const focused = activeTab === tab.key;
        const Icon = tab.Icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.75}
            onPress={() => router.push(tab.route as any)}
          >
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <Icon
                size={20}
                color={
                  focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText
                }
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? colors.primary : colors.subText },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveWrap: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
