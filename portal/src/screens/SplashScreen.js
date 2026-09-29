import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const bottomFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 2400);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, bottomFadeAnim, onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/company_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.bottomBrand, { opacity: bottomFadeAnim }]}>
        <Text style={styles.poweredByText}>powered by</Text>
        <View style={styles.omniRow}>
          <Image
            source={require('../../assets/OMNISUITE_ICON_CLEAR.png')}
            style={styles.omniIcon}
            resizeMode="contain"
          />
          <Text style={styles.omniText}>omnisuite</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.75,
    height: 220,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 45,
    alignItems: 'center',
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    fontWeight: '500',
  },
  omniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  omniIcon: {
    width: 18,
    height: 18,
  },
  omniText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0E3646',
    letterSpacing: 0.8,
  },
});
