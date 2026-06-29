import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe, useSharedValue, withTiming, withSequence, withDelay, withRepeat, runOnJS } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

function SmokeParticle({ delay }: { delay: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.2);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 600 })
      ),
      -1
    ));
    scale.value = withDelay(delay, withRepeat(
      withTiming(2.5, { duration: 800 }),
      -1
    ));
    translateX.value = withDelay(delay, withRepeat(
      withTiming(-60, { duration: 800 }),
      -1
    ));
    translateY.value = withDelay(delay, withRepeat(
      withTiming(10, { duration: 800 }),
      -1
    ));
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.smokeParticle,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale }
          ],
        },
      ]}
    />
  );
}

export function AnimatedSplashOverlay({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  const containerOpacity = useSharedValue(1);
  const bikeTranslateX = useSharedValue(-SCREEN_WIDTH);
  const textTranslateY = useSharedValue(20);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Bike moves from left to center slowly
    bikeTranslateX.value = withSequence(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.cubic) }),
      withDelay(1500, withTiming(SCREEN_WIDTH, { duration: 1200, easing: Easing.in(Easing.cubic) })) // Then move right offscreen
    );

    // Text "Chyta" moves up and fades in
    textTranslateY.value = withDelay(1200, withTiming(-120, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
    textOpacity.value = withDelay(1200, withTiming(1, { duration: 800 }));

    // Fade out the whole overlay when done
    containerOpacity.value = withDelay(4000, withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }
    }));
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splashContainer, { opacity: containerOpacity }]}>
      <Animated.Text style={[styles.splashText, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
        Chyta
      </Animated.Text>
      
      <Animated.View style={[styles.bikeContainer, { transform: [{ translateX: bikeTranslateX }] }]}>
        <View style={styles.smokeContainer}>
          {[0, 150, 300, 450, 600].map((delay, index) => (
            <SmokeParticle key={index} delay={delay} />
          ))}
        </View>
        <Image source={require('../../assets/images/logo.png')} style={styles.splashLogo} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#208AEF',
    zIndex: 1000,
  },
  splashContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2D5A27',
    position: 'absolute',
    letterSpacing: 2,
  },
  bikeContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  splashLogo: {
    width: 180,
    height: 180,
    zIndex: 10,
  },
  smokeContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 50,
    height: 50,
    zIndex: 5,
  },
  smokeParticle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#aaaaaa',
  },
});
