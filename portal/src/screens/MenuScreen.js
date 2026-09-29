import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function MenuScreen({ navigation }) {
  const { employee, user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { title: 'My Profile & Records', icon: 'person-outline', screen: 'Profile' },
    { title: 'Official Documents', icon: 'document-text-outline', screen: 'Documents' },
    { title: 'Company Policies', icon: 'book-outline', screen: 'Policies' },
    { title: 'Trainings & Certifications', icon: 'school-outline', screen: 'Training' },
    { title: 'HR Helpdesk & Requests', icon: 'help-buoy-outline', screen: 'Requests' },
    { title: 'Notification Settings', icon: 'notifications-outline', screen: 'Notifications' },
    { title: 'Security & Password', icon: 'lock-closed-outline', screen: 'Security' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Snippet */}
      <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>
            {(employee?.first_name?.[0] || user?.username?.[0] || 'E').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nameText}>{employee?.first_name || user?.username} {employee?.last_name || ''}</Text>
          <Text style={styles.subText}>{employee?.pos_name || 'Staff'} • {employee?.emp_code || 'EMP-001'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.bg.textMuted} />
      </TouchableOpacity>

      {/* Menu List */}
      <View style={styles.menuBox}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuRow, index < menuItems.length - 1 && styles.menuBorder]}
            onPress={() => item.screen && navigation.navigate(item.screen)}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={20} color={Colors.secondary.DEFAULT} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.bg.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.status.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: Colors.bg.card,
    borderColor: Colors.bg.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.secondary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: Colors.brand[950] },
  nameText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  subText: { fontSize: 12, color: Colors.bg.textMuted, marginTop: 2 },
  menuBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: { color: Colors.status.error, fontSize: 15, fontWeight: '700' },
});
