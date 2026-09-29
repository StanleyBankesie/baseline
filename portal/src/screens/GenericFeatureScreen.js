import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/client';

export default function GenericFeatureScreen({ title, icon, endpoint, emptyMsg }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (endpoint) {
      apiClient.get(endpoint)
        .then(res => setItems(res.data.policies || res.data.documents || res.data.courses || res.data.requests || []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [endpoint]);

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={Colors.secondary.DEFAULT} size="large" /></View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Ionicons name={icon} size={28} color={Colors.secondary.DEFAULT} />
        <Text style={styles.title}>{title}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{emptyMsg || 'No items available at this time.'}</Text>
        </View>
      ) : (
        items.map((item, idx) => (
          <View key={item.id || idx} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || item.subject || item.course_title || item.document_name}</Text>
            {item.description || item.content ? (
              <Text style={styles.cardDesc} numberOfLines={3}>{item.description || item.content}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.dark },
  content: { padding: 16 },
  center: { flex: 1, backgroundColor: Colors.bg.dark, justifyContent: 'center', alignItems: 'center' },
  headerBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  card: { backgroundColor: Colors.bg.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.bg.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  cardDesc: { fontSize: 13, color: Colors.bg.textMuted, marginTop: 6, lineHeight: 18 },
  emptyCard: { backgroundColor: Colors.bg.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.bg.border },
  emptyText: { color: Colors.bg.textMuted, fontSize: 14, textAlign: 'center' },
});
