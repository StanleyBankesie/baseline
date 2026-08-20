/**
 * Branch Selection Screen Component
 * Allows multi-branch users to select their active branch scope before entering the main app.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  FlatList,
  StatusBar,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth, Branch } from '../context/AuthContext';

export function BranchSelectionScreen() {
  const { userBranches, user, selectBranch, themeMode, logout } = useAuth();
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const renderBranchItem = ({ item }: { item: Branch }) => (
    <Pressable
      style={[
        styles.branchCard,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
      onPress={() => selectBranch(item)}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.branchIcon}>🏬</Text>
      </View>
      <View style={styles.branchInfo}>
        <Text style={[styles.branchName, { color: colors.text }]}>
          {item.branch_name || 'Branch'}
        </Text>
        {item.code ? (
          <Text style={[styles.branchCode, { color: colors.textSecondary }]}>
            Code: {item.code}
          </Text>
        ) : null}
      </View>
      <Text style={styles.arrowIcon}>➔</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E3646" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Active Branch</Text>
        <Text style={styles.headerSubtitle}>
          Welcome, {user?.full_name || user?.username || 'User'}. Choose your workspace branch.
        </Text>
      </View>

      <FlatList
        data={userBranches}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBranchItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No assigned branches found. Connecting to default branch...
            </Text>
            <Pressable
              style={[styles.defaultBtn, { backgroundColor: colors.brandNavy }]}
              onPress={() => selectBranch({ id: 1, branch_name: 'Main Branch' })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Continue to Main Branch</Text>
            </Pressable>
          </View>
        }
      />

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={{ color: '#EF4444', fontWeight: '600' }}>← Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0E3646',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#FBCD49',
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 54, 70, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  branchIcon: {
    fontSize: 22,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  branchCode: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#F9B514',
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  defaultBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
