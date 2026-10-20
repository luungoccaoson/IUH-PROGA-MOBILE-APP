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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#579DFF',
        tabBarInactiveTintColor: '#8C9BAB',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: '#101214',
          borderTopColor: '#22272B',
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
          title: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activePill : styles.inactiveWrap}>
              <JiraHomeIcon size={20} color={focused ? '#FFFFFF' : '#8C9BAB'} />
            </View>
          ),
        }}
      />

      {/* Tab 2: Không gian */}
      <Tabs.Screen
        name="spaces"
        options={{
          title: 'Không gian',
          tabBarLabel: 'Không gian',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activePill : styles.inactiveWrap}>
              <JiraPlanetIcon size={20} color={focused ? '#FFFFFF' : '#8C9BAB'} />
            </View>
          ),
        }}
      />

      {/* Tab 3: Tất cả công việc */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tất cả công việc',
          tabBarLabel: 'Tất cả công việc',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activePill : styles.inactiveWrap}>
              <JiraWorkIcon size={20} color={focused ? '#FFFFFF' : '#8C9BAB'} />
            </View>
          ),
        }}
      />

      {/* Tab 4: Bảng thông tin */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Bảng thông tin',
          tabBarLabel: 'Bảng thông tin',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activePill : styles.inactiveWrap}>
              <JiraBoardIcon size={20} color={focused ? '#FFFFFF' : '#8C9BAB'} />
            </View>
          ),
        }}
      />

      {/* Tab 5: Thông báo */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarLabel: 'Thông báo',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activePill : styles.inactiveWrap}>
              <JiraBellIcon size={20} color={focused ? '#FFFFFF' : '#8C9BAB'} />
            </View>
          ),
        }}
      />

      {/* Hidden secondary screens (still accessible via navigation) */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Tài Khoản & Cấu Hình',
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          href: null,
          title: 'AI Chat Agents',
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
    backgroundColor: '#1D3B6A',
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
