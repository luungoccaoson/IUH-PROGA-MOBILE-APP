import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { X, UserPlus, Search } from 'lucide-react-native';
import { workspaceService } from '../services/workspace.service';
import { userService } from '../services/user.service';
import { User } from '../types';
import { useThemeStore, ThemeColors } from '../stores/useThemeStore';

interface AddSpaceMemberModalProps {
  visible: boolean;
  workspaceId: number;
  spaceId: number;
  existingMemberIds: number[];
  onClose: () => void;
  onMemberAdded: () => void;
}

export const AddSpaceMemberModal: React.FC<AddSpaceMemberModalProps> = ({
  visible,
  workspaceId,
  spaceId,
  existingMemberIds = [],
  onClose,
  onMemberAdded,
}) => {
  const { colors, isDark } = useThemeStore();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [candidates, setCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && workspaceId) {
      loadCandidates();
    }
  }, [visible, workspaceId]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const wsMembers = await workspaceService.getWorkspaceMembers(workspaceId).catch(() => []);
      const userIds: number[] = Array.from(
        new Set(
          (wsMembers || [])
            .map((m: any) => m.id?.userId || m.userId)
            .filter((id): id is number => typeof id === 'number' && !existingMemberIds.includes(id))
        )
      );

      const profiles = await Promise.all(
        userIds.map((id) => userService.getUserById(id).catch(() => null))
      );
      const valid = profiles.filter((u): u is User => u !== null);
      setCandidates(valid);
    } catch (err) {
      console.log('Error loading workspace member candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (userId: number) => {
    try {
      setAddingId(userId);
      await workspaceService.addMemberToSpace(spaceId, userId, 3);
      Alert.alert('Thành công', 'Đã thêm thành viên vào Không gian.');
      setCandidates((prev) => prev.filter((c) => c.id !== userId));
      onMemberAdded();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm thành viên.');
    } finally {
      setAddingId(null);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    const text = name || email || 'User';
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const filtered = candidates.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <UserPlus size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Thêm thành viên vào Không gian</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.subText} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên thành viên, email..."
              placeholderTextColor={colors.mutedText}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Candidates list */}
          <ScrollView style={styles.candidateList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tải danh sách thành viên...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>
                  {candidates.length === 0
                    ? 'Tất cả thành viên Workspace đã có trong Không gian này.'
                    : 'Không tìm thấy thành viên phù hợp.'}
                </Text>
              </View>
            ) : (
              filtered.map((c) => {
                const displayName = c.fullName || c.displayName || c.username;
                return (
                  <View key={c.id} style={styles.candidateRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {getInitials(displayName, c.email)}
                      </Text>
                    </View>

                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.candidateEmail} numberOfLines={1}>
                        {c.email || `@${c.username}`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleAdd(c.id)}
                      disabled={addingId === c.id}
                      activeOpacity={0.7}
                    >
                      {addingId === c.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <UserPlus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.addBtnText}>Thêm</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 4,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      padding: 0,
    },
    candidateList: {
      maxHeight: 360,
    },
    centerBox: {
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 8,
    },
    emptyText: {
      color: colors.subText,
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 18,
    },
    candidateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    avatarCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isDark ? '#1D3B6A' : '#DEEBFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: isDark ? '#579DFF' : '#0052CC',
      fontWeight: '700',
      fontSize: 13,
    },
    candidateInfo: {
      flex: 1,
      marginRight: 10,
    },
    candidateName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    candidateEmail: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    addBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
  });
