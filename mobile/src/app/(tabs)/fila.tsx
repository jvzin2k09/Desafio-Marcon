import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { 
  Package, 
  Clock, 
  User as UserIcon, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  X,
  Send
} from 'lucide-react-native';

const getAPIHost = () => {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return 'http://localhost:3000';
  return 'http://10.0.2.2:3000';
};

const theme = {
  colors: {
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
    violet: { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
    green: { 50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
    slate: { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A' },
    surface: '#FFFFFF',
    background: '#F8FAFC',
    red: { 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' }
  },
  spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 }
};

const COLUMNS = [
  { id: 'AGUARDANDO_SEPARACAO', title: 'Novos', accent: theme.colors.blue[600], bg: theme.colors.blue[50], border: theme.colors.blue[100] },
  { id: 'EM_SEPARACAO', title: 'Separando', accent: theme.colors.amber[600], bg: theme.colors.amber[50], border: theme.colors.amber[100] },
  { id: 'PRONTO_RETIRADA', title: 'Conferência', accent: theme.colors.violet[600], bg: theme.colors.violet[50], border: theme.colors.violet[100] },
  { id: 'CONCLUIDO', title: 'Entregue', accent: theme.colors.green[600], bg: theme.colors.green[50], border: theme.colors.green[100] }
];

const getTempoEspera = (dateString) => {
  const diff = Math.floor((new Date() - new Date(dateString)) / 60000);
  if (diff < 60) return `${diff}m`;
  const hrs = Math.floor(diff / 60);
  return `${hrs}h ${diff % 60}m`;
};

const AnimatedPressable = ({ children, onPress, style, innerStyle, scaleTo = 0.95, activeOpacity = 0.9 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={activeOpacity} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={[{ width: '100%', height: '100%' }, innerStyle]}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function FilaScreen() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('AGUARDANDO_SEPARACAO');
  
  // Modals
  const [separacaoModal, setSeparacaoModal] = useState(null); // armazena o pedido sendo separado
  const [quantidadesEnviadas, setQuantidadesEnviadas] = useState({});
  const [baixaModal, setBaixaModal] = useState(null);
  const [recebedor, setRecebedor] = useState('');

  const fetchPedidos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${getAPIHost()}/api/pedidos`, { headers: { 'x-mobile-app': 'true' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPedidos(data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => fetchPedidos(false), 15000); // Polling a cada 15s
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const changeStatus = async (id, status, extraPayload = {}) => {
    try {
      const payload = { id, status, ...extraPayload };
      
      const res = await fetch(`${getAPIHost()}/api/pedidos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-mobile-app': 'true' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchPedidos(false);
        setSeparacaoModal(null);
        setBaixaModal(null);
      } else {
        alert("Erro ao atualizar status do pedido.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  const handleStartSeparacao = (id) => changeStatus(id, 'EM_SEPARACAO');
  
  const handleOpenSeparacaoModal = (pedido) => {
    const q = {};
    pedido.itens?.forEach(pi => {
      q[pi.id] = pi.quantidade.toString(); // Default para total
    });
    setQuantidadesEnviadas(q);
    setSeparacaoModal(pedido);
  };

  const handleFinishSeparacao = () => {
    if (!separacaoModal) return;
    const payloadItens = separacaoModal.itens.map(pi => ({
      id: pi.id,
      quantidadeEnviada: parseInt(quantidadesEnviadas[pi.id] || "0", 10)
    }));
    changeStatus(separacaoModal.id, 'PRONTO_RETIRADA', { itensEnviados: payloadItens });
  };

  const handleOpenBaixaModal = (pedido) => {
    setRecebedor(pedido.user?.nome || '');
    setBaixaModal(pedido);
  };

  const handleFinishBaixa = () => {
    if (!baixaModal) return;
    if (!recebedor.trim()) return alert("Digite o nome de quem está recebendo.");
    changeStatus(baixaModal.id, 'CONCLUIDO', { recebedor });
  };

  const filteredPedidos = pedidos.filter(p => p.status === activeTab);
  const activeCol = COLUMNS.find(c => c.id === activeTab) || COLUMNS[0];

  const renderFiltroColunas = () => {
    return (
      <View style={styles.topTabsWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>Deslize ao lado para ver colunas</Text>
          <ArrowRight size={12} color={theme.colors.slate[400]} style={{ marginLeft: 4 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {COLUMNS.map(col => {
            const isActive = activeTab === col.id;
            const count = pedidos.filter(p => p.status === col.id).length;
            return (
              <TouchableOpacity
                key={col.id}
                style={[styles.topTabBtn, isActive && { backgroundColor: col.bg, borderColor: col.border }]}
                onPress={() => setActiveTab(col.id)}
              >
                <View style={[styles.tabBadge, { backgroundColor: isActive ? col.accent : theme.colors.slate[200] }]}>
                  <Text style={[styles.tabBadgeText, isActive && { color: '#FFF' }]}>{count}</Text>
                </View>
                <Text style={[styles.topTabText, isActive && { color: col.accent, fontWeight: '800' }]}>{col.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderPedidoCard = ({ item }) => {
    return (
      <View style={[styles.pedidoCard, { borderColor: activeCol.border }]}>
        <View style={[styles.pedidoStatusBorder, { backgroundColor: activeCol.accent }]} />
        
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

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.userIconBg, { backgroundColor: activeCol.bg }]}>
              <UserIcon size={12} color={activeCol.accent} strokeWidth={2.5} />
            </View>
            <Text style={styles.pedidoOperador} numberOfLines={1}>{item.user?.nome || 'Operador'}</Text>
          </View>

          <View style={styles.pedidoItemsList}>
            {(item.itens || []).slice(0, 3).map((i, index) => (
              <View key={index} style={styles.pedidoItemRow}>
                <View style={styles.pedidoItemDot} />
                <Text style={styles.pedidoItemName} numberOfLines={1}>
                  <Text style={styles.pedidoItemQty}>{i.quantidade}× </Text>
                  {i.item?.nome || 'Item'}
                </Text>
              </View>
            ))}
            {(item.itens?.length || 0) > 3 && (
              <Text style={styles.pedidoItemsMore}>+ {item.itens.length - 3} itens</Text>
            )}
          </View>

          {/* Action Footer */}
          <View style={styles.cardActions}>
            {activeTab === 'AGUARDANDO_SEPARACAO' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeCol.bg }]} onPress={() => handleStartSeparacao(item.id)}>
                <Text style={[styles.actionBtnText, { color: activeCol.accent }]}>INICIAR SEPARAÇÃO</Text>
                <ArrowRight size={14} color={activeCol.accent} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
            
            {activeTab === 'EM_SEPARACAO' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeCol.accent }]} onPress={() => handleOpenSeparacaoModal(item)}>
                <CheckCircle2 size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>FINALIZAR SEPARAÇÃO</Text>
              </TouchableOpacity>
            )}

            {activeTab === 'PRONTO_RETIRADA' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1E293B' }]} onPress={() => handleOpenBaixaModal(item)}>
                <QrCode size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>BAIXA / ENTREGAR</Text>
              </TouchableOpacity>
            )}

            {activeTab === 'CONCLUIDO' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
                <CheckCircle2 size={16} color={theme.colors.green[600]} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.green[600], marginLeft: 6 }}>ENTREGUE</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fila de Almoxarifado</Text>
        <Text style={styles.headerSubtitle}>Gestão de requisições e separação</Text>
      </View>

      {renderFiltroColunas()}

      <FlatList
        data={filteredPedidos}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPedidoCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPedidos(true)} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Package color={theme.colors.slate[300]} size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyStateTitle}>Nenhum pedido aqui</Text>
              <Text style={styles.emptyStateText}>A fila para esta etapa está vazia.</Text>
            </View>
          )
        }
      />

      {/* Modal de Separação (Inputs) */}
      <Modal visible={!!separacaoModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {separacaoModal && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Conferência de Separação</Text>
                    <Text style={styles.modalDesc}>Pedido #{separacaoModal.id?.toString().padStart(4, '0')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSeparacaoModal(null)} style={styles.closeBtn}>
                    <X color={theme.colors.slate[500]} size={20} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={{ maxHeight: 350, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
                  {separacaoModal.itens?.map(pi => (
                    <View key={pi.id} style={styles.sepItemBox}>
                      <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={styles.sepItemName} numberOfLines={2}>{pi.item?.nome}</Text>
                        <Text style={styles.sepItemReq}>Solicitado: {pi.quantidade} {pi.item?.unidade || 'UN'}</Text>
                      </View>
                      <View style={styles.sepInputWrap}>
                        <Text style={styles.sepInputLabel}>Enviado</Text>
                        <TextInput
                          style={styles.sepInput}
                          keyboardType="numeric"
                          value={quantidadesEnviadas[pi.id]}
                          onChangeText={(v) => setQuantidadesEnviadas(prev => ({...prev, [pi.id]: v}))}
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>
                
                <TouchableOpacity style={styles.confirmBtn} onPress={handleFinishSeparacao}>
                  <Send color="#FFF" size={16} style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>Confirmar e Enviar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Baixa / Entrega */}
      <Modal visible={!!baixaModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {baixaModal && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Confirmar Entrega</Text>
                    <Text style={styles.modalDesc}>Pedido #{baixaModal.id?.toString().padStart(4, '0')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setBaixaModal(null)} style={styles.closeBtn}>
                    <X color={theme.colors.slate[500]} size={20} />
                  </TouchableOpacity>
                </View>
                
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.slate[400], marginBottom: 8, letterSpacing: 0.5 }}>QUEM ESTÁ RECEBENDO?</Text>
                  <TextInput
                    style={styles.recebedorInput}
                    value={recebedor}
                    onChangeText={setRecebedor}
                    placeholder="Nome completo..."
                    placeholderTextColor={theme.colors.slate[400]}
                    autoCapitalize="words"
                  />
                </View>
                
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.colors.green[600] }]} onPress={handleFinishBaixa}>
                  <CheckCircle2 color="#FFF" size={18} style={{ marginRight: 8 }} />
                  <Text style={styles.confirmBtnText}>Concluir Pedido</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: theme.colors.slate[900], letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: theme.colors.slate[500], marginTop: 4 },
  
  topTabsWrap: { marginHorizontal: theme.spacing.lg, marginBottom: 16 },
  topTabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radii.full, borderWidth: 1, borderColor: 'transparent', backgroundColor: theme.colors.slate[50] },
  topTabText: { fontSize: 13, fontWeight: '600', color: theme.colors.slate[500] },
  tabBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[500] },
  
  listBoxContainer: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: 'hidden', flex: 1 },
  listBoxHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100], backgroundColor: theme.colors.slate[50] },
  listBoxTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.slate[800], textTransform: 'uppercase' },
  listBoxCount: { fontSize: 12, color: theme.colors.slate[500], marginTop: 2 },
  
  listContent: { paddingHorizontal: theme.spacing.lg, paddingTop: 16, paddingBottom: 40 },
  
  pedidoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pedidoStatusBorder: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 6 },
  pedidoCardInner: { padding: 16, paddingLeft: 22 },
  
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pedidoIdBadge: { backgroundColor: theme.colors.slate[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoId: { fontSize: 13, fontWeight: '800', color: theme.colors.slate[500], fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 0.5 },
  pedidoTimeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], paddingHorizontal: 8, paddingVertical: 6, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoTimeText: { fontSize: 11, fontWeight: '800', color: theme.colors.slate[500], marginLeft: 6 },
  
  userIconBg: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  pedidoOperador: { fontSize: 13, fontWeight: '800', color: theme.colors.slate[700], flexShrink: 1, marginRight: 12 },
  
  pedidoItemsList: { backgroundColor: theme.colors.slate[50], borderRadius: theme.radii.lg, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.slate[100] },
  pedidoItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pedidoItemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.slate[300], marginRight: 8 },
  pedidoItemName: { fontSize: 13, color: theme.colors.slate[600], flex: 1, fontWeight: '600' },
  pedidoItemQty: { fontWeight: '800', color: theme.colors.slate[800] },
  pedidoItemsMore: { fontSize: 11, fontWeight: '700', color: theme.colors.slate[400], marginTop: 4, marginLeft: 12 },
  
  cardActions: { paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.slate[100] },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: theme.radii.lg },
  actionBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.slate[800], marginBottom: 8 },
  emptyStateText: { fontSize: 14, fontWeight: '500', color: theme.colors.slate[500], textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.slate[900] },
  modalDesc: { fontSize: 13, color: theme.colors.slate[500], marginTop: 4, fontWeight: '600' },
  closeBtn: { backgroundColor: theme.colors.slate[100], padding: 6, borderRadius: theme.radii.full },
  
  sepItemBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.slate[50], padding: 12, borderRadius: theme.radii.lg, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.slate[200] },
  sepItemName: { fontSize: 13, fontWeight: '700', color: theme.colors.slate[800], marginBottom: 4 },
  sepItemReq: { fontSize: 11, fontWeight: '600', color: theme.colors.slate[500] },
  sepInputWrap: { alignItems: 'center' },
  sepInputLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], marginBottom: 4 },
  sepInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.colors.slate[300], borderRadius: theme.radii.md, width: 60, height: 40, textAlign: 'center', fontSize: 16, fontWeight: '800', color: theme.colors.slate[900] },
  
  recebedorInput: { backgroundColor: theme.colors.slate[50], borderWidth: 1, borderColor: theme.colors.slate[200], borderRadius: theme.radii.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: theme.colors.slate[900] },
  
  confirmBtn: { backgroundColor: theme.colors.blue[600], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: theme.radii.xl, marginTop: 16 },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' }
});
