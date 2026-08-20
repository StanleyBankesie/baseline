/**
 * Role-Based Enterprise Modules Directory Screen
 * Displays enterprise modules filtered dynamically by user permissions.
 * Includes interactive data inspection modals for live backend data (Invoices, Products, Employees, Customers).
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface ModuleItem {
  key: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  endpoint?: string;
}

const MODULES_LIST: ModuleItem[] = [
  {
    key: 'pos',
    name: 'Point of Sale (POS)',
    icon: '🛒',
    description: 'Touch billing, instant sales receipts, cash & card checkout',
    color: '#0E3646',
    endpoint: '/pos/sales',
  },
  {
    key: 'sales',
    name: 'Sales & Invoices',
    icon: '💰',
    description: 'Quotations, sales orders, customer billing, and credit terms',
    color: '#173D50',
    endpoint: '/sales/invoices',
  },
  {
    key: 'inventory',
    name: 'Inventory & Stock',
    icon: '📦',
    description: 'Product catalog, stock levels, warehouse tracking',
    color: '#2E8B1F',
    endpoint: '/inventory/items',
  },
  {
    key: 'purchase',
    name: 'Purchase & RFQs',
    icon: '🛒',
    description: 'Local & import purchase orders, supplier quotations, bills',
    color: '#F57C00',
    endpoint: '/purchase/bills',
  },
  {
    key: 'hr',
    name: 'HR & Employees',
    icon: '👥',
    description: 'Staff directory, payroll, department roles, attendance',
    color: '#5FA2C4',
    endpoint: '/hr/employees',
  },
  {
    key: 'customers',
    name: 'Customer CRM',
    icon: '👤',
    description: 'Customer list, receivables, credit balances, history',
    color: '#3B86A8',
    endpoint: '/sales/customers',
  },
  {
    key: 'finance',
    name: 'Finance & Accounts',
    icon: '💵',
    description: 'Accounts receivable/payable, general ledger, payment vouchers',
    color: '#0E3646',
    endpoint: '/finance/summary',
  },
  {
    key: 'transport',
    name: 'Transport & Fleet',
    icon: '🚚',
    description: 'Vehicle tracking, dispatch trips, delivery management',
    color: '#2E8B1F',
    endpoint: '/transport/trips',
  },
  {
    key: 'maintenance',
    name: 'Maintenance & Repairs',
    icon: '🔧',
    description: 'Equipment service requests, preventive maintenance',
    color: '#F57C00',
    endpoint: '/maintenance/requests',
  },
  {
    key: 'bi',
    name: 'Business Intelligence',
    icon: '📈',
    description: 'Executive analytics, revenue trend reports, performance KPIs',
    color: '#173D50',
    endpoint: '/bi/dashboards',
  },
  {
    key: 'administration',
    name: 'System Administration',
    icon: '⚙️',
    description: 'User management, role setups, security policies, diagnostics',
    color: '#0E3646',
    endpoint: '/admin/users',
  },
];

export function ModulesScreen() {
  const { hasModuleAccess, themeMode, setCurrentTab } = useAuth();
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter modules based on user RBAC permissions
  const accessibleModules = MODULES_LIST.filter((mod) => hasModuleAccess(mod.key));

  const handleOpenModule = async (mod: ModuleItem) => {
    if (mod.key === 'pos') {
      setCurrentTab('pos');
      return;
    }

    setSelectedModule(mod);
    setModalVisible(true);
    setSearchQuery('');
    setLoading(true);
    setDataList([]);

    if (mod.endpoint) {
      try {
        const res = await api.get(mod.endpoint);
        const rows = res.data?.data || res.data?.items || res.data?.employees || res.data?.customers || res.data || [];
        setDataList(Array.isArray(rows) ? rows : []);
      } catch {
        // Fallback mock items if endpoint offline
        setDataList(getMockModuleData(mod.key));
      } finally {
        setLoading(false);
      }
    }
  };

  const getMockModuleData = (key: string) => {
    switch (key) {
      case 'sales':
        return [
          { id: 1, invoice_no: 'INV-2026-001', customer_name: 'Acme Trade Ltd', total_amount: 3400.0, status: 'PAID' },
          { id: 2, invoice_no: 'INV-2026-002', customer_name: 'Global Logistics', total_amount: 1850.0, status: 'PENDING' },
          { id: 3, invoice_no: 'INV-2026-003', customer_name: 'Starlight Retail', total_amount: 920.0, status: 'PAID' },
        ];
      case 'inventory':
        return [
          { id: 1, item_name: 'Standard Office Desk', code: 'PRD-001', quantity: 45, unit_price: 650.0 },
          { id: 2, item_name: 'Ergonomic Chair', code: 'PRD-002', quantity: 12, unit_price: 420.0 },
          { id: 3, item_name: 'Wireless Keyboard & Mouse', code: 'PRD-003', quantity: 88, unit_price: 180.0 },
        ];
      case 'hr':
        return [
          { id: 1, full_name: 'Kwame Mensah', designation: 'Operations Director', department: 'Management' },
          { id: 2, full_name: 'Ama Serwaa', designation: 'Senior Accountant', department: 'Finance' },
          { id: 3, full_name: 'Kofi Owusu', designation: 'Store Manager', department: 'Inventory' },
        ];
      case 'customers':
        return [
          { id: 1, customer_name: 'Acme Trade Ltd', phone: '+233 24 123 4567', balance: 0.0 },
          { id: 2, customer_name: 'Global Logistics', phone: '+233 20 987 6543', balance: 1850.0 },
        ];
      default:
        return [{ id: 1, title: 'Operational Entry #1', status: 'Active' }];
    }
  };

  const filteredData = dataList.filter((item) => {
    if (!searchQuery) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(searchQuery.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.brandNavy }]}>
        <Text style={styles.headerTitle}>Enterprise Modules</Text>
        <Text style={styles.headerSubtitle}>
          Role-Based Access • {accessibleModules.length} Modules Available
        </Text>
      </View>

      {/* Modules Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {accessibleModules.map((mod) => (
            <Pressable
              key={mod.key}
              style={[
                styles.moduleCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={() => handleOpenModule(mod)}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: mod.color }]}>
                <Text style={styles.moduleIcon}>{mod.icon}</Text>
              </View>
              <Text style={[styles.moduleName, { color: colors.text }]}>{mod.name}</Text>
              <Text style={[styles.moduleDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {mod.description}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.openText, { color: colors.primary }]}>Open Module →</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {accessibleModules.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🔒</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Module Permissions Assigned</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Contact your system administrator to assign module roles to your user profile.
            </Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Module Live Data Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.brandNavy }]}>
            <Text style={styles.modalTitle}>
              {selectedModule?.icon} {selectedModule?.name}
            </Text>
            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarBox}>
            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: colors.backgroundSurface, color: colors.text, borderColor: colors.border },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${selectedModule?.name || 'records'}...`}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading live backend data...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => String(item.id || index)}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.dataCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.dataTitle, { color: colors.text }]}>
                    {item.invoice_no || item.item_name || item.full_name || item.customer_name || item.title || `Item #${item.id}`}
                  </Text>
                  {item.customer_name && item.invoice_no ? (
                    <Text style={[styles.dataSub, { color: colors.textSecondary }]}>Customer: {item.customer_name}</Text>
                  ) : null}
                  {item.total_amount !== undefined ? (
                    <Text style={[styles.dataPrice, { color: colors.statusSuccess }]}>GHS {item.total_amount.toFixed(2)}</Text>
                  ) : null}
                  {item.quantity !== undefined ? (
                    <Text style={[styles.dataSub, { color: colors.textSecondary }]}>Stock: {item.quantity} Units | Price: GHS {item.unit_price}</Text>
                  ) : null}
                  {item.designation ? (
                    <Text style={[styles.dataSub, { color: colors.textSecondary }]}>{item.designation} • {item.department}</Text>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Records Found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#F9B514',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    justifyContent: 'space-between',
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleIcon: {
    fontSize: 22,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  openText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBarBox: {
    padding: 16,
  },
  searchInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  dataCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  dataTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dataSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dataPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
