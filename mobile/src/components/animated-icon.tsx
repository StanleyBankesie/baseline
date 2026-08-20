/**
 * Animated Splash Overlay Component for OmniSuite Mobile
 * Plays a smooth brand bootup animation on app launch before transitioning to Login/Main.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

export function AnimatedSplashOverlay({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo bounce & fade-in
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Text tagline fade-in
    textOpacity.value = withTiming(1, { duration: 1000 });

    // Transition out after 2.2 seconds
    containerOpacity.value = withSequence(
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
          if (onComplete) {
            runOnJS(onComplete)();
          }
        }
      })
    );
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splashContainer, { opacity: containerOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E3646" />
      <Animated.View
        style={[
          styles.logoCircle,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.logoIcon}>🏢</Text>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.brandTitle}>OmniSuite</Text>
        <Text style={styles.brandTagline}>Enterprise Business Management Platform</Text>
      </Animated.View>
    </Animated.View>
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
    shadowColor: '#F9B514',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
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
    letterSpacing: 0.5,
  },
});
