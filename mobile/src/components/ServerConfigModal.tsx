/**
 * Server Configuration Modal Component
 * Allows users and developers to dynamically update the backend API Base URL.
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Modal, Alert } from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ServerConfigModal({ visible, onClose }: ServerConfigModalProps) {
  const { serverUrl, updateServerUrl, themeMode } = useAuth();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const modeKey: 'light' | 'dark' = themeMode === 'light' ? 'light' : 'dark';
  const colors = Colors[modeKey];

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Server URL cannot be empty.');
      return;
    }
    await updateServerUrl(urlInput.trim());
    Alert.alert('Server Configured', `API URL updated to:\n${urlInput.trim()}`);
    onClose();
  };

  const handlePreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>⚙️ API Server Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Configure the backend server endpoint for database connection.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Backend API Endpoint URL:</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.backgroundSurface, color: colors.text, borderColor: colors.border },
            ]}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="e.g. http://10.0.2.2:5000/api or https://domain.com/api"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.presetTitle, { color: colors.textSecondary }]}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            <Pressable
              style={[styles.presetChip, { backgroundColor: colors.backgroundSurface }]}
              onPress={() => handlePreset('http://10.0.2.2:5000/api')}
            >
              <Text style={[styles.presetText, { color: colors.primary }]}>Android Emulator (10.0.2.2)</Text>
            </Pressable>
            <Pressable
              style={[styles.presetChip, { backgroundColor: colors.backgroundSurface }]}
              onPress={() => handlePreset('http://localhost:5000/api')}
            >
              <Text style={[styles.presetText, { color: colors.primary }]}>Localhost (5000)</Text>
            </Pressable>
            <Pressable
              style={[styles.presetChip, { backgroundColor: colors.backgroundSurface }]}
              onPress={() => handlePreset('https://demoserver.omnisuite-erp.com/api')}
            >
              <Text style={[styles.presetText, { color: colors.primary }]}>Live Production Demo</Text>
            </Pressable>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.saveBtn, { backgroundColor: colors.brandNavy }]}
              onPress={handleSave}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>Save Settings</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {},
  btnText: {
    fontSize: 14,
  },
});
