import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function ProfileScreen() {
  const { employee, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/profile');
      setProfile(res.data.employee || employee);
    } catch (e) {
      setProfile(employee);
    } finally {
      setLoading(false);
    }
  };

  const emp = profile || employee;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{(emp?.first_name?.[0] || 'E').toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{emp?.first_name} {emp?.last_name}</Text>
        <Text style={styles.code}>{emp?.emp_code || 'EMP-001'} • {emp?.pos_name || 'Staff'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Employment Details</Text>
        <View style={styles.row}><Text style={styles.label}>Department</Text><Text style={styles.val}>{emp?.dept_name || 'Executive'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Position</Text><Text style={styles.val}>{emp?.pos_name || 'System Administrator'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={[styles.val, { color: Colors.status.success }]}>{emp?.status || 'ACTIVE'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Joining Date</Text><Text style={styles.val}>{emp?.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'N/A'}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.row}><Text style={styles.label}>Email Address</Text><Text style={styles.val}>{emp?.email || user?.email || 'N/A'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Phone Number</Text><Text style={styles.val}>{emp?.phone || 'N/A'}</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.brand[900],
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.brand[700],
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.secondary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: { fontSize: 28, fontWeight: '800', color: Colors.brand[950] },
  name: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  code: { fontSize: 13, color: Colors.secondary.DEFAULT, marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.bg.border,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bg.border },
  label: { fontSize: 13, color: Colors.bg.textMuted },
  val: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
