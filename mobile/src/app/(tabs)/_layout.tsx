import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Package, LayoutList, ShoppingCart, History, LogOut } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- Custom Animated Tab Bar Component ---
const TabBarButton = ({ state, descriptors, navigation }) => {
  const handleLogout = () => {
    router.replace('/');
  };

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        
        const isFocused = state.index === index;
        const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

        // Animação clássica: quando clica, o ícone encolhe (spring) e revela o texto/cor
        React.useEffect(() => {
          Animated.spring(scaleAnim, {
            toValue: isFocused ? 1 : 0,
            friction: 5,
            tension: 50,
            useNativeDriver: false,
          }).start();
        }, [isFocused]);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconScale = scaleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2]
        });

        const iconColor = isFocused ? '#3B82F6' : '#94A3B8';

        const getIcon = () => {
          if (route.name === 'estoque') return <Package color={iconColor} size={24} />;
          if (route.name === 'pedidos') return <ShoppingCart color={iconColor} size={24} />;
          if (route.name === 'fila') return <LayoutList color={iconColor} size={24} />;
          if (route.name === 'historico') return <History color={iconColor} size={24} />;
          return <Package color={iconColor} size={24} />;
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            onPress={onPress}
            style={styles.tabButton}
          >
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              {getIcon()}
            </Animated.View>
            {isFocused && (
              <Animated.Text style={[styles.tabLabel, { opacity: scaleAnim }]}>
                {label}
              </Animated.Text>
            )}
            {isFocused && (
              <Animated.View style={[styles.indicator, { transform: [{ scaleX: scaleAnim }] }]} />
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogout}
        style={styles.tabButton}
      >
        <LogOut color="#EF4444" size={24} />
      </TouchableOpacity>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBarButton {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen 
        name="estoque" 
        options={{ title: 'Estoque' }} 
      />
      <Tabs.Screen 
        name="pedidos" 
        options={{ title: 'Pedidos' }} 
      />
      <Tabs.Screen 
        name="fila" 
        options={{ title: 'Fila Almox.' }} 
      />
      <Tabs.Screen 
        name="historico" 
        options={{ title: 'Histórico' }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    elevation: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 4,
  },
  indicator: {
    position: 'absolute',
    top: -2,
    width: 24,
    height: 4,
    backgroundColor: '#3B82F6',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  }
});
