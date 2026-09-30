import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  TextInput,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  Easing
} from 'react-native';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  MapPin, 
  ShieldAlert,
  Bell,
  BellOff,
  ChevronRight
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- Design Tokens (Espelhados do Tailwind Web) ---
const theme = {
  colors: {
    background: '#F8FAFC', // slate-50
    surface: '#FFFFFF', // white
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      800: '#1E293B',
      900: '#0F172A',
    },
    emerald: { 50: '#ECFDF5', 200: '#A7F3D0', 500: '#10B981', 600: '#059669', 700: '#047857' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E' },
    red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 900: '#7F1D1D' },
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 500: '#3B82F6', 600: '#2563EB', 800: '#1E40AF', 900: '#1E3A8A' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999 },
};

// --- Componentes com Microinterações (design-spells) ---
const AnimatedPressable = ({ children, onPress, style, scaleTo = 0.96 }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 20 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPressIn={handlePressIn} 
        onPressOut={handlePressOut} 
        onPress={onPress}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MobileEstoqueScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [notifPerm, setNotifPerm] = useState('granted');

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      let API_URL = 'http://10.0.2.2:3000/api/items';
      if (Platform.OS === 'web' || Platform.OS === 'ios') {
        API_URL = 'http://localhost:3000/api/items';
      }
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(() => fetchItems(), 30000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const getMin = (item) => item.limiteMinimo ?? 10;
  
  const emptyItems = items.filter(i => i.quantidade <= 0);
  const lowItems = items.filter(i => i.quantidade > 0 && i.quantidade <= getMin(i));
  const okItems = items.filter(i => i.quantidade > getMin(i));
  const allCritical = [...emptyItems, ...lowItems];

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.nome.toLowerCase().includes(q) && !item.codigo.toLowerCase().includes(q)) return false;
    if (filter === "low") return item.quantidade > 0 && item.quantidade <= getMin(item);
    if (filter === "empty") return item.quantidade <= 0;
    if (filter === "ok") return item.quantidade > getMin(item);
    return true;
  });

  // Renderização do Card de Métrica
  const MetricCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Icon color={color} size={20} />
      </View>
      <Text style={[styles.metricValue, { color: color === theme.colors.blue[600] ? theme.colors.slate[900] : color }]}>
        {value}
      </Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );

  // Renderização do Item da Lista (Mantendo o layout Web Adaptado)
  const renderItem = ({ item }) => {
    const isZero = item.quantidade <= 0;
    const isLow = item.quantidade > 0 && item.quantidade <= getMin(item);
    const maxCap = Math.max(getMin(item) * 2, item.quantidade, 1);
    const percent = Math.max(0, Math.min(100, Math.round((item.quantidade / maxCap) * 100)));

    let statusColor = theme.colors.emerald[500];
    let statusBg = theme.colors.emerald[50];
    let statusBorder = theme.colors.emerald[200];
    let statusText = 'Em Dia';

    if (isZero) {
      statusColor = theme.colors.red[600];
      statusBg = theme.colors.red[50];
      statusBorder = theme.colors.red[200];
      statusText = item.quantidade < 0 ? 'Falta / Negativo' : 'Esgotado';
    } else if (isLow) {
      statusColor = theme.colors.amber[500];
      statusBg = theme.colors.amber[50];
      statusBorder = theme.colors.amber[200];
      statusText = 'Est. Baixo';
    }

    return (
      <View style={[styles.itemCard, { borderLeftColor: statusColor }]}>
        <View style={styles.itemTopRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.nome}</Text>
            <View style={styles.itemMetaRow}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{item.codigo}</Text>
              </View>
              <View style={styles.locBadge}>
                <MapPin size={12} color={theme.colors.slate[500]} />
                <Text style={styles.locText}>{item.localizacao || 'S/L'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <Text style={[styles.statusPillText, { color: statusColor === theme.colors.amber[500] ? theme.colors.amber[800] : statusColor === theme.colors.red[600] ? theme.colors.red[700] : theme.colors.emerald[700] }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.itemBottomRow}>
          <View>
            <Text style={styles.minLabel}>Mín: {getMin(item)}</Text>
            <View style={styles.qtyRow}>
              <Text style={[styles.qtyValue, { color: statusColor }]}>{item.quantidade}</Text>
              <Text style={styles.qtyUnit}>{item.unidade}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>{percent}% capacidade</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: statusColor }]} />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* --- CABEÇALHO PRINCIPAL --- */}
        <View style={styles.mainHeader}>
          <View>
            <Text style={styles.largeTitle}>Painel de Estoque</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Tempo Real Ativo</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.notifIconBtn} onPress={() => setNotifPerm(notifPerm === 'granted' ? 'denied' : 'granted')}>
            {notifPerm === 'granted' ? <Bell size={24} color={theme.colors.emerald[600]} /> : <BellOff size={24} color={theme.colors.slate[500]} />}
          </TouchableOpacity>
        </View>

        {/* --- PAINEL SUPERIOR --- */}
        <View style={styles.fixedTopPanel}>
          {/* BANNER DE ALERTA CRÍTICO (Apenas se houver urgência) */}
          {allCritical.length > 0 && (
            <View style={styles.alertBanner}>
              <View style={styles.alertHeader}>
                <View style={styles.alertIconWrap}>
                  <ShieldAlert color={theme.colors.red[600]} size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.alertTitle}>Reposição Urgente</Text>
                  <Text style={styles.alertSubtitle}>Peças em nível crítico de segurança</Text>
                </View>
                <View style={styles.alertCountBadge}>
                  <Text style={styles.alertCountText}>{allCritical.length} PEÇAS</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4, paddingRight: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.red[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>Deslize ➔</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.criticalScroll} contentContainerStyle={{ gap: 8 }}>
                {allCritical.map(item => (
                  <AnimatedPressable 
                    key={item.id} 
                    onPress={() => { setFilter('all'); setSearch(item.codigo); }}
                    style={styles.criticalChip}
                  >
                    {item.quantidade === 0 ? <XCircle size={14} color={theme.colors.red[700]} /> : <AlertTriangle size={14} color={theme.colors.amber[600]} />}
                    <Text style={styles.criticalChipCode}>{item.codigo}</Text>
                    <Text style={styles.criticalChipName} numberOfLines={1}>{item.nome}</Text>
                    <View style={styles.criticalChipQty}>
                      <Text style={styles.criticalChipQtyText}>{item.quantidade}/{getMin(item)}</Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* CARDS DE MÉTRICAS */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4, marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.slate[400], textTransform: 'uppercase' }}>Deslize para mais</Text>
            <ChevronRight size={14} color={theme.colors.slate[400]} style={{ marginLeft: 2 }} />
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.metricsContainer}
            snapToInterval={152}
            decelerationRate="fast"
          >
            <MetricCard title="Total" value={items.length} subtitle="Monitoradas" icon={Layers} color={theme.colors.blue[600]} />
            <MetricCard title="Seguro" value={okItems.length} subtitle="Acima do min" icon={CheckCircle2} color={theme.colors.emerald[500]} />
            <MetricCard title="Baixo" value={lowItems.length} subtitle="Abaixo do min" icon={AlertTriangle} color={theme.colors.amber[500]} />
            <MetricCard title="Esgotado" value={emptyItems.length} subtitle="Saldo zerado" icon={XCircle} color={theme.colors.red[600]} />
          </ScrollView>

          {/* BUSCA E FILTROS */}
          <View style={styles.toolbar}>
            <View style={styles.searchWrap}>
              <Search color={theme.colors.slate[400]} size={18} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Buscar peça por código, nome..."
                placeholderTextColor={theme.colors.slate[400]}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6, paddingRight: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>Deslize filtros ➔</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {[
                { id: 'all', label: `Todos (${items.length})` },
                { id: 'low', label: `Estoque Baixo (${lowItems.length})`, icon: AlertTriangle, color: theme.colors.amber[500], bg: theme.colors.amber[50], text: theme.colors.amber[700] },
                { id: 'empty', label: `Esgotados (${emptyItems.length})`, icon: XCircle, color: theme.colors.red[600], bg: theme.colors.red[50], text: theme.colors.red[700] },
                { id: 'ok', label: `Em Dia (${okItems.length})`, icon: CheckCircle2, color: theme.colors.emerald[600], bg: theme.colors.emerald[50], text: theme.colors.emerald[700] },
              ].map(f => {
                const isActive = filter === f.id;
                const isBase = f.id === 'all';
                return (
                  <AnimatedPressable 
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    style={[
                      styles.filterBtn, 
                      isActive 
                        ? { backgroundColor: isBase ? theme.colors.slate[900] : f.color } 
                        : { backgroundColor: isBase ? theme.colors.slate[100] : f.bg }
                    ]}
                  >
                    {f.icon && <f.icon size={14} color={isActive ? '#FFF' : f.text} style={{ marginRight: 6 }} />}
                    <Text style={[
                      styles.filterBtnText, 
                      { color: isActive ? '#FFF' : (isBase ? theme.colors.slate[600] : f.text) }
                    ]}>
                      {f.label}
                    </Text>
                  </AnimatedPressable>
                )
              })}
            </ScrollView>
          </View>
        </View>

        {/* --- CAIXA DE LISTAGEM DE ITENS (Scroll Interno) --- */}
        <View style={styles.listBoxContainer}>
          <View style={styles.listBoxHeader}>
            <Text style={styles.listBoxTitle}>Lista de Peças</Text>
            <Text style={styles.listBoxCount}>{filteredItems.length} itens encontrados</Text>
          </View>
          <FlatList
            style={{ maxHeight: 600 }} // Trava a altura desta caixa específica para rolar os itens
            nestedScrollEnabled={true}
            data={filteredItems}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={true}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} />}
            renderItem={renderItem}
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Nenhuma peça encontrada com os critérios informados.</Text>
              </View>
            )
          }
        />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Fundo mais escuro para efeito Shadow Box
  },
  scrollContent: {
    paddingBottom: 100, // Espaço da nav bar
  },
  listHeaderBlock: {
    padding: theme.spacing.lg,
    paddingTop: 8,
    gap: theme.spacing.lg,
  },
  
  // Header Principal Extraído
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 12,
  },
  fixedTopPanel: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 8,
    paddingBottom: 8,
    gap: theme.spacing.lg,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.slate[900],
    letterSpacing: -0.5,
  },
  liveBadgeRow: {
    flexDirection: 'row',
  },
  notifIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  liveDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.emerald[500],
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.emerald[700],
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.slate[500],
    marginBottom: 16,
  },
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.emerald[50],
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.emerald[200],
  },
  notifButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Alert Banner
  alertBanner: {
    backgroundColor: theme.colors.red[50],
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.red[200],
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.red[500],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconWrap: {
    width: 36, height: 36,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.red[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.red[900],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertSubtitle: {
    fontSize: 11,
    color: theme.colors.red[700],
    marginTop: 2,
  },
  alertCountBadge: {
    backgroundColor: theme.colors.red[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  alertCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  criticalScroll: {
    marginTop: 4,
  },
  criticalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 226, 226, 0.8)', // red-100/80
    borderWidth: 1,
    borderColor: theme.colors.red[300],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.md,
  },
  criticalChipCode: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.slate[900],
    marginHorizontal: 6,
  },
  criticalChipName: {
    fontSize: 11,
    color: theme.colors.slate[800],
    maxWidth: 100,
    marginRight: 6,
  },
  criticalChipQty: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalChipQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.red[700],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Metrics
  metricsContainer: {
    gap: 12,
    paddingRight: 20, // To allow scrolling to end
  },
  metricCard: {
    width: 140, // Reduzido para expor claramente que é rolável
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    borderLeftWidth: 4,
    // Pure shadow box effect
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metricSubtitle: {
    fontSize: 10,
    color: theme.colors.slate[400],
    marginTop: 4,
  },

  // Toolbar
  toolbar: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.xl,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    borderRadius: theme.radii.lg,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.slate[800],
    fontWeight: '500',
  },
  filtersScroll: {
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // List Box Container
  listBoxContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  listBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
    backgroundColor: theme.colors.surface,
    zIndex: 1,
  },
  listBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.slate[800],
  },
  listBoxCount: {
    fontSize: 12,
    color: theme.colors.slate[400],
    fontWeight: '600',
  },

  // List Items
  itemCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
    borderLeftWidth: 4,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.slate[900],
    marginBottom: 6,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    backgroundColor: theme.colors.blue[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.blue[100],
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.blue[800],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locText: {
    fontSize: 10,
    color: theme.colors.slate[500],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    paddingTop: 12,
  },
  minLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.slate[400],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 24,
  },
  qtyUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.slate[500],
    marginLeft: 4,
  },
  progressSection: {
    width: 100,
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.slate[400],
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.slate[100],
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.full,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.slate[400],
    textAlign: 'center',
  }
});
