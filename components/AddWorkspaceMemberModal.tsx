import React, { useState, useEffect } from 'react';
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

interface AddWorkspaceMemberModalProps {
  visible: boolean;
  workspaceId: number;
  existingMemberIds: number[];
  onClose: () => void;
  onMemberInvited: () => void;
}

export const AddWorkspaceMemberModal: React.FC<AddWorkspaceMemberModalProps> = ({
  visible,
  workspaceId,
  existingMemberIds = [],
  onClose,
  onMemberInvited,
}) => {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [invitingId, setInvitingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && workspaceId) {
      loadCandidates();
    }
  }, [visible, workspaceId]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const allUsers = await userService.getAllUsers().catch(() => []);
      const filtered = allUsers.filter(
        (u) => typeof u.id === 'number' && !existingMemberIds.includes(u.id)
      );
      setCandidates(filtered);
    } catch (err) {
      console.log('Error loading workspace candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (userId: number, name: string) => {
    try {
      setInvitingId(userId);
      await workspaceService.inviteMember(workspaceId, userId, 3);
      Alert.alert('Thành công', `Đã gửi lời mời tham gia Workspace tới ${name}.`);
      setCandidates((prev) => prev.filter((c) => c.id !== userId));
      onMemberInvited();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể gửi lời mời tham gia Workspace.');
    } finally {
      setInvitingId(null);
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
              <UserPlus size={20} color="#579DFF" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Thêm thành viên vào Workspace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#8C9BAB" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#8C9BAB" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên người dùng, email..."
              placeholderTextColor="#626F86"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Candidates list */}
          <ScrollView style={styles.candidateList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#579DFF" />
                <Text style={styles.loadingText}>Đang tải người dùng hệ thống...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>
                  {candidates.length === 0
                    ? 'Tất cả người dùng hệ thống đã có trong Workspace này.'
                    : 'Không tìm thấy người dùng phù hợp.'}
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
                      style={styles.inviteBtn}
                      onPress={() => handleInvite(c.id, displayName)}
                      disabled={invitingId === c.id}
                      activeOpacity={0.7}
                    >
                      {invitingId === c.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <UserPlus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.inviteBtnText}>Mời</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1C2127',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#282E33',
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
    color: '#E6EDF3',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A1D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#282E33',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#E6EDF3',
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
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    color: '#8C9BAB',
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
    borderBottomColor: '#22272B',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1D3B6A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#579DFF',
    fontWeight: '700',
    fontSize: 13,
  },
  candidateInfo: {
    flex: 1,
    marginRight: 10,
  },
  candidateName: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '600',
  },
  candidateEmail: {
    color: '#8C9BAB',
    fontSize: 12,
    marginTop: 2,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C66E4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
