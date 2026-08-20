/**
 * Animated Splash Overlay Component for OmniSuite Mobile (Web)
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';

export function AnimatedSplashOverlay({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoIcon}>🏢</Text>
      </View>
      <Text style={styles.brandTitle}>OmniSuite</Text>
      <Text style={styles.brandTagline}>Enterprise Business Management Platform</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0E3646',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#173D50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9B514',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 44,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#F9B514',
    fontWeight: '600',
    marginTop: 6,
  },
});
