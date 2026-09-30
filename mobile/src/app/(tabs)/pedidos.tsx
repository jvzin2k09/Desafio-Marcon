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
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image
} from 'react-native';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Package, 
  Plus,
  Minus,
  X,
  Send,
  AlertCircle,
  ShoppingCart,
  Clock,
  User as UserIcon,
  ChevronRight,
  Factory
} from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const getAPIHost = () => {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return 'http://localhost:3000';
  return 'http://10.0.2.2:3000';
};

// --- Design Tokens (Baseline UI) ---
const theme = {
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surface2: '#F1F5F9',
    slate: {
      50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
      500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A',
    },
    emerald: { 50: '#ECFDF5', 200: '#A7F3D0', 500: '#10B981', 600: '#059669', 700: '#047857' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
    orange: { 50: '#FFF7ED', 200: '#FED7AA', 500: '#F97316', 600: '#EA580C', 700: '#C2410C' },
    red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 500: '#3B82F6', 600: '#2563EB', 800: '#1E40AF', 900: '#1E3A8A' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999 },
};

const STATUS_MAP = {
  AGUARDANDO_SEPARACAO: { label: "Aguardando", accent: theme.colors.blue[600], bg: theme.colors.blue[50], border: theme.colors.blue[200] },
  EM_SEPARACAO:         { label: "Em Separação", accent: theme.colors.amber[600], bg: theme.colors.amber[50], border: theme.colors.amber[200] },
  PRONTO_RETIRADA:      { label: "Pronto Retirada", accent: theme.colors.emerald[600], bg: theme.colors.emerald[50], border: theme.colors.emerald[200] },
  ATENDIDO_PARCIALMENTE:{ label: "Parcial", accent: theme.colors.orange[600], bg: theme.colors.orange[50], border: theme.colors.orange[200] },
};

const LOGO_MAP = {
  'Usinagem': `${getAPIHost()}/logomecanica.png`,
  'Logística': `${getAPIHost()}/logomovimento.png`,
  'Manutenção': `${getAPIHost()}/logohidraulica.png`,
  'Montagem': `${getAPIHost()}/logopratika.png`
};

const getLinhaData = (codigo) => {
  const linhaMap = {
    'TM-001': 'Usinagem', 'TM-002': 'Usinagem', 'TM-003': 'Usinagem',
    'TM-004': 'Usinagem', 'TM-005': 'Usinagem',
    'TM-006': 'Montagem', 'TM-007': 'Montagem', 'TM-008': 'Montagem',
    'TM-009': 'Manutenção', 'TM-010': 'Manutenção',
  };
  const linhaColors = {
    'Usinagem': { bg: '#EBF5FF', border: '#0072BC', dot: '#0072BC' },
    'Logística': { bg: '#E8F5E9', border: '#008C45', dot: '#008C45' },
    'Manutenção': { bg: '#FFEBEE', border: '#D32027', dot: '#D32027' },
    'Montagem': { bg: '#FFF8E1', border: '#D4A017', dot: '#D4A017' },
  };
  const nome = linhaMap[codigo] || 'Logística';
  return { nome, ...linhaColors[nome], logo: LOGO_MAP[nome] };
};

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

// --- Microinterações (Design Spells) ---
const AnimatedPressable = ({ children, onPress, style, scaleTo = 0.95, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={activeOpacity} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const CartItemControl = ({ item, inCart, updateCartQty, removeFromCart, updateCartQtyExact }) => {
  const [val, setVal] = useState(inCart.quantidade.toString());

  useEffect(() => {
    setVal(inCart.quantidade.toString());
  }, [inCart.quantidade]);

  const handleBlur = () => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      removeFromCart(item.id);
    } else {
      updateCartQtyExact(item.id, num);
      setVal(Math.min(num, inCart.maxQtd).toString());
    }
  };

  return (
    <View style={styles.cartControl}>
      <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} style={styles.cartBtn}>
        <Minus size={14} color={theme.colors.slate[600]} />
      </TouchableOpacity>
      <View style={styles.cartQtyWrap}>
        <TextInput 
          style={styles.cartQtyInput}
          value={val}
          keyboardType="numeric"
          onChangeText={setVal}
          onBlur={handleBlur}
          selectTextOnFocus
        />
      </View>
      <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} style={styles.cartBtn}>
        <Plus size={14} color={theme.colors.slate[600]} />
      </TouchableOpacity>
    </View>
  );
};

export default function PedidosScreen() {
  const [activeTab, setActiveTab] = useState('pedido'); // 'pedido' | 'status'
  
  // Estado: Novo Pedido
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [setor, setSetor] = useState('');
  const [cart, setCart] = useState([]);
  
  // Estado: Meus Pedidos
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  
  // Modal de Submit
  const [showModal, setShowModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [operador, setOperador] = useState('');
  const [ordemProducao, setOrdemProducao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const fetchItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${getAPIHost()}/api/items`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      }
    } catch (e) { console.log(e); } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const res = await fetch(`${getAPIHost()}/api/pedidos`, {
        headers: { 'x-mobile-app': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filtrando localmente para simular o "meus pedidos" como na web.
          // Na web ele filtra p.userId === session.user.id. Como no app não temos auth, pegamos todos ativos.
          setMeusPedidos(data.filter(p => p.status !== "CONCLUIDO" && p.status !== "ESTORNADO"));
        }
      }
    } catch (e) { console.log(e); } finally {
      setLoadingPedidos(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pedido') fetchItems();
    else fetchPedidos();
  }, [activeTab, fetchItems, fetchPedidos]);

  // --- Lógica Novo Pedido ---
  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.nome.toLowerCase().includes(q) && !item.codigo.toLowerCase().includes(q)) return false;
    const linha = getLinhaData(item.codigo);
    if (setor && linha.nome !== setor) return false;
    return true;
  });

  const addToCart = (item) => {
    if (item.quantidade <= 0) return;
    setCart([...cart, { itemId: item.id, nome: item.nome, codigo: item.codigo, unidade: item.unidade, quantidade: 1, maxQtd: item.quantidade }]);
  };

  const updateCartQty = (itemId, delta) => {
    const item = cart.find(c => c.itemId === itemId);
    if (!item) return;
    const newQty = item.quantidade + delta;
    if (newQty <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c => c.itemId === itemId ? { ...c, quantidade: Math.min(newQty, c.maxQtd) } : c));
    }
  };

  const updateCartQtyExact = (itemId, num) => {
    const item = cart.find(c => c.itemId === itemId);
    if (!item) return;
    if (num <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(c => c.itemId === itemId ? { ...c, quantidade: Math.min(num, c.maxQtd) } : c));
    }
  };

  const removeFromCart = (itemId) => setCart(cart.filter(c => c.itemId !== itemId));

  const handleConfirmSubmit = async () => {
    if (cart.length === 0) return;
    if (!operador.trim()) {
      setSubmitError(true);
      setTimeout(() => setSubmitError(false), 3000);
      return;
    }
    setSubmitting(true);
    setSubmitError(false);
    
    try {
      const res = await fetch(`${getAPIHost()}/api/pedidos/criar`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-mobile-app": "true" 
        },
        body: JSON.stringify({
          itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade })),
          setor: setor || null,
          operadorSolicitante: operador.trim(),
          ordem_producao: ordemProducao.trim() || null,
        }),
      });
      if (res.ok) {
        setCart([]);
        setSearch('');
        setOperador('');
        setOrdemProducao('');
        setShowModal(false);
        setActiveTab('status'); // Mudar para tela de status para ver o pedido criado!
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Renderização de Componentes ---

  const renderTopTabs = () => (
    <View style={styles.topTabsWrap}>
      <TouchableOpacity 
        style={[styles.topTabBtn, activeTab === 'pedido' && styles.topTabActive]}
        onPress={() => setActiveTab('pedido')}
        activeOpacity={0.8}
      >
        <ShoppingCart color={activeTab === 'pedido' ? theme.colors.slate[900] : theme.colors.slate[400]} size={16} />
        <Text style={[styles.topTabText, activeTab === 'pedido' && styles.topTabTextActive]}>Novo Pedido</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.topTabBtn, activeTab === 'status' && styles.topTabActive]}
        onPress={() => setActiveTab('status')}
        activeOpacity={0.8}
      >
        <Clock color={activeTab === 'status' ? theme.colors.slate[900] : theme.colors.slate[400]} size={16} />
        <Text style={[styles.topTabText, activeTab === 'status' && styles.topTabTextActive]}>Meus Pedidos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const inCart = cart.find(c => c.itemId === item.id);
    const linha = getLinhaData(item.codigo);

    return (
      <View style={styles.itemCard}>
        <Text style={styles.linhaTextTop}>{linha.nome}</Text>

        <View style={styles.itemMainRow}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: linha.logo }} style={styles.logoImg} resizeMode="contain" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.nome}</Text>
            <View style={styles.itemMetaRow}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{item.codigo}</Text>
              </View>
              <Text style={styles.dot}>·</Text>
              <View style={[styles.statusPill, { backgroundColor: item.quantidade > 0 ? theme.colors.emerald[50] : theme.colors.red[50] }]}>
                <Text style={[styles.statusPillText, { color: item.quantidade > 0 ? theme.colors.emerald[700] : theme.colors.red[700] }]}>
                  {item.quantidade} {item.unidade} disp.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.itemControls}>
            {inCart ? (
              <CartItemControl 
                item={item} 
                inCart={inCart} 
                updateCartQty={updateCartQty} 
                updateCartQtyExact={updateCartQtyExact} 
                removeFromCart={removeFromCart} 
              />
            ) : (
              <AnimatedPressable 
                onPress={() => addToCart(item)}
                style={[styles.addBtn, item.quantidade === 0 && { opacity: 0.5 }]}
                scaleTo={0.92}
              >
                <Plus size={18} color={theme.colors.blue[600]} />
              </AnimatedPressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderFiltroSetor = (value, color) => {
    const isActive = setor === value;
    const linha = getLinhaData(value === 'Logística' ? 'TM-011' : value === 'Usinagem' ? 'TM-001' : value === 'Manutenção' ? 'TM-009' : 'TM-006');
    
    return (
      <AnimatedPressable 
        key={value}
        onPress={() => setSetor(isActive ? '' : value)}
        style={[
          styles.filterBtn, 
          isActive 
            ? { backgroundColor: color, borderColor: color, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' } 
            : { backgroundColor: theme.colors.surface, borderColor: theme.colors.slate[200] }
        ]}
      >
        <Image source={{ uri: linha.logo }} style={{ width: 16, height: 16, marginRight: 6 }} resizeMode="contain" />
        <Text style={[
          styles.filterBtnText, 
          { color: isActive ? '#FFF' : theme.colors.slate[600] }
        ]}>
          {value}
        </Text>
      </AnimatedPressable>
    );
  };

  const renderPedidoCard = ({ item }) => {
    const statusData = STATUS_MAP[item.status] || STATUS_MAP.AGUARDANDO_SEPARACAO;
    const isCompleted = item.status === 'CONCLUIDO';
    
    return (
      <AnimatedPressable key={item.id} style={[styles.pedidoCard, isCompleted && { opacity: 0.7 }]} scaleTo={0.97} onPress={() => setSelectedPedido(item)}>
        <View style={[styles.pedidoStatusBorder, { backgroundColor: statusData.accent }]} />
        
        <View style={styles.pedidoCardInner}>
          <View style={styles.pedidoHeader}>
            <View style={styles.pedidoIdBadge}>
              <Text style={styles.pedidoId}>#{item.id?.toString().padStart(4, '0')}</Text>
            </View>
            <View style={styles.pedidoTimeBadge}>
              <Clock size={12} color={theme.colors.slate[500]} strokeWidth={2.5} />
              <Text style={styles.pedidoTimeText}>{getTempoEspera(item.createdAt)}</Text>
            </View>
          </View>

          {(item.setor || item.observacao) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              {item.setor && (
                <View style={styles.infoTag}>
                  <Factory size={12} color={theme.colors.slate[500]} />
                  <Text style={styles.infoTagText} numberOfLines={1}>{item.setor}</Text>
                </View>
              )}
              {item.observacao && (
                <View style={styles.infoTag}>
                  <Text style={styles.infoTagText} numberOfLines={1}>{item.observacao}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.pedidoItemsList}>
            {(item.itens || []).slice(0, 3).map((i, index) => (
              <View key={index} style={styles.pedidoItemRow}>
                <View style={styles.pedidoItemDot} />
                <Text style={styles.pedidoItemName} numberOfLines={1}>
                  <Text style={styles.pedidoItemQty}>{i.quantidade}× </Text>
                  {i.item?.nome || 'Item removido'}
                </Text>
              </View>
            ))}
            {(item.itens?.length || 0) > 3 && (
              <Text style={styles.pedidoItemsMore}>+ {item.itens.length - 3} outros itens...</Text>
            )}
          </View>

          <View style={styles.pedidoFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.userIconBg, { backgroundColor: statusData.bg }]}>
                <UserIcon size={12} color={statusData.accent} strokeWidth={2.5} />
              </View>
              <Text style={styles.pedidoOperador} numberOfLines={1}>{item.operadorSolicitante || 'Desconhecido'}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusData.bg, borderColor: statusData.border }]}>
              <Text style={[styles.statusPillText, { color: statusData.accent }]}>{statusData.label}</Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.largeTitle}>Módulo Solicitante</Text>
          <Text style={styles.subtitle}>Faça e acompanhe suas requisições</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        {renderTopTabs()}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={
          <RefreshControl 
            refreshing={activeTab === 'pedido' ? refreshing : loadingPedidos} 
            onRefresh={() => activeTab === 'pedido' ? fetchItems(true) : fetchPedidos()} 
          />
        }
      >
        {activeTab === 'pedido' ? (
          <>
            <View style={styles.fixedTopPanel}>
              <View style={styles.toolbar}>
                <View style={styles.searchWrap}>
                  <Search color={theme.colors.slate[400]} size={18} />
                  <TextInput 
                    style={styles.searchInput}
                    placeholder="Buscar peça por código ou nome..."
                    placeholderTextColor={theme.colors.slate[400]}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.filterLabel, { marginBottom: 0 }]}>SETOR SOLICITANTE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>Deslize ➔</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                  {renderFiltroSetor('Usinagem', '#0072BC')}
                  {renderFiltroSetor('Logística', '#008C45')}
                  {renderFiltroSetor('Manutenção', '#D32027')}
                  {renderFiltroSetor('Montagem', '#D4A017')}
                </ScrollView>
              </View>
            </View>

            <View style={styles.listBoxContainer}>
              <View style={styles.listBoxHeader}>
                <Text style={styles.listBoxTitle}>Catálogo de Peças</Text>
                <Text style={styles.listBoxCount}>{filteredItems.length} itens encontrados</Text>
              </View>
              <FlatList
                style={{ maxHeight: 600 }}
                nestedScrollEnabled={true}
                data={filteredItems}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={true}
                renderItem={renderItem}
                ListEmptyComponent={
                  !loading && (
                    <View style={styles.emptyState}>
                      <Package color={theme.colors.slate[300]} size={48} style={{ marginBottom: 12 }} />
                      <Text style={styles.emptyStateText}>Nenhuma peça encontrada.</Text>
                    </View>
                  )
                }
              />
            </View>
          </>
        ) : (
          <View style={styles.statusContainer}>
            {loadingPedidos ? (
              <ActivityIndicator size="large" color={theme.colors.blue[600]} style={{ marginTop: 40 }} />
            ) : meusPedidos.length === 0 ? (
              <View style={styles.emptyState}>
                <Package color={theme.colors.slate[300]} size={48} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyStateTitle}>Nenhum pedido ativo</Text>
                <Text style={styles.emptyStateText}>Faça um novo pedido na aba ao lado.</Text>
              </View>
            ) : (
              meusPedidos.map(item => renderPedidoCard({ item }))
            )}
          </View>
        )}
      </ScrollView>

      {/* CARRINHO FLUTUANTE (Apenas na aba Pedido) */}
      {activeTab === 'pedido' && cart.length > 0 && (
        <Animated.View style={styles.floatingCart}>
          <View style={styles.cartInfo}>
            <View style={styles.cartIconBadge}>
              <ShoppingCart color={theme.colors.blue[600]} size={20} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.cartTitle}>Carrinho ({cart.length})</Text>
              <Text style={styles.cartSubtitle}>{cart.reduce((acc, c) => acc + c.quantidade, 0)} itens selecionados</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cartSubmitBtn} onPress={() => setShowModal(true)}>
            <Send color="#FFF" size={16} />
            <Text style={styles.cartSubmitText}>Revisar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Identificação do Operador</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <X color={theme.colors.slate[500]} size={20} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalDesc}>Revise os itens do pedido e informe os dados para prosseguir.</Text>
              
              <View style={styles.cartSummaryBox}>
                <Text style={styles.cartSummaryTitle}>ITENS SELECIONADOS ({cart.length})</Text>
                <ScrollView style={{ maxHeight: 120, marginVertical: 8 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                  {cart.map(c => (
                    <View key={c.itemId} style={styles.cartSummaryItem}>
                      <View style={styles.cartSummaryQtyBadge}>
                        <Text style={styles.cartSummaryQtyText}>{c.quantidade}x</Text>
                      </View>
                      <Text style={styles.cartSummaryName} numberOfLines={1}>{c.nome}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OPERADOR SOLICITANTE *</Text>
                <TextInput
                  style={[styles.modalInput, submitError && !operador.trim() && { borderColor: theme.colors.red[500], backgroundColor: theme.colors.red[50] }]}
                  placeholder="Ex: João Silva / Matrícula 123"
                  placeholderTextColor={theme.colors.slate[400]}
                  value={operador}
                  onChangeText={setOperador}
                />
                {submitError && !operador.trim() && (
                  <View style={styles.errorRow}>
                    <AlertCircle color={theme.colors.red[500]} size={12} />
                    <Text style={styles.errorText}>Este campo é obrigatório.</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ORDEM DE PRODUÇÃO / CC (Opcional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: OP-2023 / CC-405"
                  placeholderTextColor={theme.colors.slate[400]}
                  value={ordemProducao}
                  onChangeText={setOrdemProducao}
                />
              </View>

              <AnimatedPressable 
                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]} 
                onPress={handleConfirmSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Send color="#FFF" size={18} style={{ marginRight: 8 }} />
                    <Text style={styles.confirmBtnText}>Confirmar Requisição</Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DETALHE DO PEDIDO */}
      <Modal visible={!!selectedPedido} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPedido && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Pedido #{selectedPedido.id?.toString().padStart(4, '0')}</Text>
                  <TouchableOpacity onPress={() => setSelectedPedido(null)} style={styles.closeBtn}>
                    <X color={theme.colors.slate[500]} size={20} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  <Text style={styles.modalDesc}>Status atual: {STATUS_MAP[selectedPedido.status]?.label || 'Aguardando'}</Text>
                  
                  <View style={styles.cartSummaryBox}>
                    <Text style={styles.cartSummaryTitle}>ITENS SOLICITADOS ({selectedPedido.itens?.length || 0})</Text>
                    <ScrollView style={{ maxHeight: 200, marginVertical: 8 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                      {selectedPedido.itens?.map((c, i) => (
                        <View key={i} style={styles.cartSummaryItem}>
                          <View style={styles.cartSummaryQtyBadge}>
                            <Text style={styles.cartSummaryQtyText}>{c.quantidade}x</Text>
                          </View>
                          <Text style={styles.cartSummaryName} numberOfLines={2}>{c.item?.nome}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => setSelectedPedido(null)}>
                    <Text style={styles.confirmBtnText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  mainHeader: { paddingHorizontal: theme.spacing.lg, paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  largeTitle: { fontSize: 28, fontWeight: '900', color: theme.colors.slate[900], letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: theme.colors.slate[500], marginTop: 4 },
  
  // Top Tabs
  topTabsWrap: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.slate[200] },
  topTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: theme.radii.md },
  topTabActive: { backgroundColor: theme.colors.slate[100] },
  topTabText: { fontSize: 13, fontWeight: '700', color: theme.colors.slate[500], marginLeft: 6 },
  topTabTextActive: { color: theme.colors.slate[900] },

  // Panel
  fixedTopPanel: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
  toolbar: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radii.xl, borderWidth: 1, borderColor: theme.colors.slate[200] },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], borderWidth: 1, borderColor: theme.colors.slate[200], borderRadius: theme.radii.lg, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.slate[800], fontWeight: '500' },
  filterLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], marginBottom: 8, letterSpacing: 0.5 },
  filtersScroll: { gap: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radii.md, borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontWeight: '700' },

  // List Box
  listBoxContainer: { flex: 1, backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg, borderRadius: theme.radii.xl, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: 'hidden' },
  listBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: theme.spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[200], backgroundColor: theme.colors.surface, zIndex: 1 },
  listBoxTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.slate[800] },
  listBoxCount: { fontSize: 12, color: theme.colors.slate[400], fontWeight: '600' },
  
  // Item Card
  itemCard: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] },
  linhaTextTop: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  itemMainRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  logoWrap: { width: 40, height: 40, borderRadius: theme.radii.md, backgroundColor: theme.colors.slate[50], borderWidth: 1, borderColor: theme.colors.slate[200], justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoImg: { width: 24, height: 24 },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemName: { fontSize: 14, fontWeight: '700', color: theme.colors.slate[900], marginBottom: 6 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  codeBadge: { backgroundColor: theme.colors.slate[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  codeText: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[700], fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  dot: { fontSize: 10, fontWeight: '900', color: theme.colors.slate[300] },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'transparent' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  
  // Controls
  itemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 80 },
  addBtn: { width: 40, height: 40, borderRadius: theme.radii.full, backgroundColor: theme.colors.slate[50], borderWidth: 1, borderColor: theme.colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  cartControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], borderWidth: 1, borderColor: theme.colors.slate[200], borderRadius: theme.radii.full, padding: 2 },
  cartBtn: { width: 32, height: 32, backgroundColor: '#FFF', borderRadius: theme.radii.full, borderWidth: 1, borderColor: theme.colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  cartQtyWrap: { width: 40, alignItems: 'center', justifyContent: 'center' },
  cartQtyInput: { width: 40, fontSize: 15, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: theme.colors.slate[800], textAlign: 'center', padding: 0, margin: 0, height: 32 },
  
  // Empty states
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.slate[800], marginBottom: 4 },
  emptyStateText: { fontSize: 13, fontWeight: '500', color: theme.colors.slate[500], textAlign: 'center' },

  // Status (Meus Pedidos)
  statusContainer: { paddingHorizontal: theme.spacing.lg },
  pedidoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: 'hidden' },
  pedidoCardInner: { padding: 16, paddingLeft: 20 },
  pedidoStatusBorder: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pedidoIdBadge: { backgroundColor: theme.colors.slate[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoId: { fontSize: 13, fontWeight: '800', color: theme.colors.slate[500], fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 0.5 },
  pedidoTimeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], paddingHorizontal: 8, paddingVertical: 6, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoTimeText: { fontSize: 11, fontWeight: '800', color: theme.colors.slate[500], marginLeft: 6 },
  
  infoTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: theme.colors.slate[100], maxWidth: '60%' },
  infoTagText: { fontSize: 11, fontWeight: '700', color: theme.colors.slate[500], marginLeft: 6 },
  
  pedidoItemsList: { backgroundColor: theme.colors.slate[50], borderRadius: theme.radii.lg, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pedidoItemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.slate[300], marginRight: 8 },
  pedidoItemName: { fontSize: 13, color: theme.colors.slate[600], flex: 1, fontWeight: '600' },
  pedidoItemQty: { fontWeight: '800', color: theme.colors.slate[800] },
  pedidoItemsMore: { fontSize: 11, fontWeight: '700', color: theme.colors.slate[400], marginTop: 4, marginLeft: 12 },
  
  pedidoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.slate[100] },
  userIconBg: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pedidoOperador: { fontSize: 13, fontWeight: '800', color: theme.colors.slate[700], flexShrink: 1, marginRight: 12 },

  // Floating Cart
  floatingCart: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, left: theme.spacing.lg, right: theme.spacing.lg, backgroundColor: theme.colors.slate[900], borderRadius: theme.radii.xl, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  cartInfo: { flexDirection: 'row', alignItems: 'center' },
  cartIconBadge: { backgroundColor: theme.colors.slate[800], padding: 8, borderRadius: theme.radii.md },
  cartTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cartSubtitle: { color: theme.colors.slate[400], fontSize: 12, fontWeight: '600' },
  cartSubmitBtn: { backgroundColor: theme.colors.blue[600], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radii.lg },
  cartSubmitText: { color: '#FFF', fontSize: 13, fontWeight: '800', marginLeft: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.slate[900] },
  closeBtn: { backgroundColor: theme.colors.slate[100], padding: 6, borderRadius: theme.radii.full },
  modalBody: { gap: 16 },
  modalDesc: { fontSize: 13, color: theme.colors.slate[500], marginBottom: 8 },
  cartSummaryBox: { backgroundColor: theme.colors.slate[50], borderRadius: theme.radii.lg, padding: 12, borderWidth: 1, borderColor: theme.colors.slate[200] },
  cartSummaryTitle: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], letterSpacing: 0.5, marginBottom: 4 },
  cartSummaryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] },
  cartSummaryQtyBadge: { backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.colors.slate[200], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  cartSummaryQtyText: { fontSize: 11, fontWeight: '800', color: theme.colors.slate[700], fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cartSummaryName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.slate[800] },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], letterSpacing: 0.5 },
  modalInput: { backgroundColor: theme.colors.slate[50], borderWidth: 2, borderColor: theme.colors.slate[200], borderRadius: theme.radii.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: theme.colors.slate[900], fontWeight: '600' },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  errorText: { color: theme.colors.red[600], fontSize: 11, fontWeight: '800', marginLeft: 4 },
  confirmBtn: { backgroundColor: theme.colors.blue[600], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: theme.radii.xl, marginTop: 8 },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});
