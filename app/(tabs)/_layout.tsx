import { translate as tr, useTranslation } from '../../i18n';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import {
  JiraHomeIcon,
  JiraPlanetIcon,
  JiraWorkIcon,
  JiraBoardIcon,
  JiraBellIcon,
} from '../../components/jira/JiraIcons';
import { useThemeStore } from '../../stores/useThemeStore';

export default function TabLayout() {
  const { colors, isDark } = useThemeStore();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      {/* Tab 1: Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("Trang chủ"),
          tabBarLabel: t("Trang chủ"),
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <JiraHomeIcon
                size={20}
                color={focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText}
              />
            </View>
          ),
        }}
      />

      {/* Tab 2: Không gian */}
      <Tabs.Screen
        name="spaces"
        options={{
          title: t("Không gian"),
          tabBarLabel: t("Không gian"),
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <JiraPlanetIcon
                size={20}
                color={focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText}
              />
            </View>
          ),
        }}
      />

      {/* Tab 3: Tất cả công việc */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: t("Tất cả công việc"),
          tabBarLabel: t("Tất cả công việc"),
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <JiraWorkIcon
                size={20}
                color={focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText}
              />
            </View>
          ),
        }}
      />

      {/* Tab 4: Bảng thông tin */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("Bảng thông tin"),
          tabBarLabel: t("Bảng thông tin"),
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <JiraBoardIcon
                size={20}
                color={focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText}
              />
            </View>
          ),
        }}
      />

      {/* Tab 5: Thông báo */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("Thông báo"),
          tabBarLabel: t("Thông báo"),
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.activePill : styles.inactiveWrap,
                focused && { backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF' },
              ]}
            >
              <JiraBellIcon
                size={20}
                color={focused ? (isDark ? '#FFFFFF' : '#0052CC') : colors.subText}
              />
            </View>
          ),
        }}
      />

      {/* Hidden secondary screens (still accessible via navigation) */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: t("Tài Khoản & Cấu Hình"),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          href: null,
          title: tr("AI Chat Agents"),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activePill: {
    width: 52,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveWrap: {
    width: 52,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
