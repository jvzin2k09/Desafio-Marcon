import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  PanResponder, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard
} from 'react-native';
import { Mail, Lock, EyeOff, Eye, LogIn } from 'lucide-react-native';
import Svg, { Line, Polygon, Circle } from 'react-native-svg';

// --- Tokens de Design (theme-factory / product-design) ---
const theme = {
  colors: {
    background: '#F8FAFC', // Slate 50
    surface: 'rgba(255, 255, 255, 0.85)',
    primary: '#0F172A', // Slate 900
    primaryHover: '#1E293B', // Slate 800
    secondary: '#3B82F6', // Blue 500
    text: {
      heading: '#0F172A', // Slate 900
      body: '#64748B', // Slate 500
      muted: '#94A3B8', // Slate 400
    },
    border: '#E2E8F0', // Slate 200
    borderFocus: '#3B82F6', // Blue 500
    error: '#EF4444', // Red 500
    triangleNormal: 'rgba(15, 23, 42, 0.08)',
    triangleHighlight: 'rgba(59, 130, 246, 0.15)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

const { width, height } = Dimensions.get('window');
const POINTS_COUNT = 35; 

// --- Componentes Reutilizáveis com Microinterações (design-spells) ---

const AnimatedInput = ({ icon: Icon, placeholder, value, onChangeText, secureTextEntry, rightIcon, onRightIconPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // borderColor não suporta native driver nativamente sem reanimated
    }).start();
  }, [isFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.borderFocus]
  });

  const iconColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.text.muted, theme.colors.secondary]
  });

  return (
    <Animated.View style={[styles.inputGroup, { borderColor }]}>
      <View style={styles.iconContainer}>
        {/* AnimatedIcon mockup com Animated.View */}
        <Animated.View>
          <Icon color={isFocused ? theme.colors.secondary : theme.colors.text.muted} size={20} />
        </Animated.View>
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="none"
        keyboardType={secureTextEntry ? "default" : "email-address"}
      />
      {rightIcon && (
        <TouchableOpacity style={styles.eyeIcon} onPress={onRightIconPress} activeOpacity={0.7}>
          {rightIcon}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const AnimatedButton = ({ onPress, loading, title, icon: Icon }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.loginButtonText}>{title}</Text>
            {Icon && <Icon color="#fff" size={20} />}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

import { useRouter } from 'expo-router';

// --- Tela Principal ---

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renderState, setRenderState] = useState(0); 
  
  // Transition Animation States
  const [isSuccess, setIsSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const transitionScale = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(0)).current;

  const touchPos = useRef({ x: -1000, y: -1000 });
  
  // Cache dos pontos geométricos
  const points = useRef(
    Array.from({ length: POINTS_COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      originX: Math.random() * width,
      originY: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.0, 
      vy: (Math.random() - 0.5) * 1.0,
    }))
  );

  useEffect(() => {
    let animationFrameId;
    const draw = () => {
      if (isSuccess) return; // Pausa animação no sucesso
      const currentPoints = points.current;
      for (let i = 0; i < currentPoints.length; i++) {
        let p = currentPoints[i];
        p.originX += p.vx;
        p.originY += p.vy;
        
        if (p.originX < 0 || p.originX > width) p.vx *= -1;
        if (p.originY < 0 || p.originY > height) p.vy *= -1;

        const dx = touchPos.current.x - p.originX;
        const dy = touchPos.current.y - p.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.x = p.originX + (dx * force * 0.3); 
          p.y = p.originY + (dy * force * 0.3);
        } else {
          p.x += (p.originX - p.x) * 0.08;
          p.y += (p.originY - p.y) * 0.08;
        }
      }
      setRenderState(prev => prev + 1);
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isSuccess]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        touchPos.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        Keyboard.dismiss();
      },
      onPanResponderMove: (evt) => {
        touchPos.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
      },
      onPanResponderRelease: () => {
        touchPos.current = { x: -1000, y: -1000 };
      },
    })
  ).current;

  const triggerSuccessAnimation = (name) => {
    setUserName(name);
    setIsSuccess(true);
    
    // Anima o círculo azul gigante e o texto
    Animated.parallel([
      Animated.timing(transitionScale, {
        toValue: 50, // Escala massiva para cobrir a tela
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(transitionOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300, // Mostra o texto após o círculo começar a expandir
        useNativeDriver: true,
      })
    ]).start(() => {
      // Após a animação, redireciona
      setTimeout(() => {
        router.replace('/(tabs)/estoque');
      }, 500);
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    try {
      let API_URL = 'http://10.0.2.2:3000/api/mobile/login'; 
      if (Platform.OS === 'web') {
        API_URL = 'http://localhost:3000/api/mobile/login';
      } else if (Platform.OS === 'ios') {
        API_URL = 'http://localhost:3000/api/mobile/login';
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao fazer login");
        setLoading(false);
        return;
      }
      
      // Sucesso! Dispara a magia.
      triggerSuccessAnimation(data.user.name || "Administrador");

    } catch (error) {
      alert("Erro de conexão com o servidor.");
      setLoading(false);
    }
  };

  const renderTriangles = () => {
    const elements = [];
    let keyCount = 0;
    const currentPoints = points.current;
    
    for (let i = 0; i < currentPoints.length; i++) {
      for (let j = i + 1; j < currentPoints.length; j++) {
        const dx = currentPoints[i].x - currentPoints[j].x;
        const dy = currentPoints[i].y - currentPoints[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          elements.push(
            <Line
              key={`line-${keyCount++}`}
              x1={currentPoints[i].x} y1={currentPoints[i].y}
              x2={currentPoints[j].x} y2={currentPoints[j].y}
              stroke={theme.colors.triangleNormal}
              strokeOpacity={1 - dist/120}
              strokeWidth="1"
            />
          );

          for (let k = j + 1; k < currentPoints.length; k++) {
            const dx2 = currentPoints[j].x - currentPoints[k].x;
            const dy2 = currentPoints[j].y - currentPoints[k].y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            const dx3 = currentPoints[k].x - currentPoints[i].x;
            const dy3 = currentPoints[k].y - currentPoints[i].y;
            const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);

            if (dist2 < 120 && dist3 < 120) {
              const avgX = (currentPoints[i].x + currentPoints[j].x + currentPoints[k].x) / 3;
              const avgY = (currentPoints[i].y + currentPoints[j].y + currentPoints[k].y) / 3;
              const mDx = touchPos.current.x - avgX;
              const mDy = touchPos.current.y - avgY;
              const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
              
              let fill = theme.colors.triangleNormal;
              let opacity = 0.03;
              if (mDist < 150) {
                fill = theme.colors.triangleHighlight;
                opacity = 0.15 * (1 - mDist / 150);
              }

              elements.push(
                <Polygon
                  key={`poly-${keyCount++}`}
                  points={`${currentPoints[i].x},${currentPoints[i].y} ${currentPoints[j].x},${currentPoints[j].y} ${currentPoints[k].x},${currentPoints[k].y}`}
                  fill={fill}
                  fillOpacity={opacity}
                />
              );
            }
          }
        }
      }
      elements.push(
        <Circle
          key={`circle-${i}`}
          cx={currentPoints[i].x} cy={currentPoints[i].y} r="1.5"
          fill={theme.colors.triangleNormal}
        />
      );
    }
    return elements;
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Svg height={height} width={width}>
          {renderTriangles()}
        </Svg>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
        pointerEvents={isSuccess ? 'none' : 'box-none'}
      >
        <Animated.View style={[styles.card, { opacity: isSuccess ? 0 : 1 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Almoxarifado</Text>
            <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>
          </View>
          
          <AnimatedInput 
            icon={Mail}
            placeholder="E-mail corporativo"
            value={email}
            onChangeText={setEmail}
          />

          <AnimatedInput 
            icon={Lock}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? <EyeOff color={theme.colors.text.muted} size={20} /> : <Eye color={theme.colors.text.muted} size={20} />}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <AnimatedButton 
            onPress={handleLogin}
            loading={loading}
            title="Entrar no sistema"
            icon={LogIn}
          />
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Camada de Transição Animada */}
      {isSuccess && (
        <View style={[StyleSheet.absoluteFill, styles.transitionOverlay]} pointerEvents="none">
          <Animated.View 
            style={[
              styles.transitionCircle, 
              { transform: [{ scale: transitionScale }] }
            ]} 
          />
          <Animated.View style={[styles.transitionContent, { opacity: transitionOpacity }]}>
            <Text style={styles.welcomeTitle}>Bem-vindo de volta,</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// --- Estilos Baseline UI ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 420,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(16px)' }),
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.text.body,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  iconContainer: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.text.heading,
    fontWeight: '500',
    height: 54,
  },
  eyeIcon: {
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.xs,
  },
  forgotText: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transitionOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  transitionCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.secondary, // A expansão azul
  },
  transitionContent: {
    alignItems: 'center',
    zIndex: 1000,
  },
  welcomeTitle: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 8,
  },
  welcomeName: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  }
});
