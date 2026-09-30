import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  Platform,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { 
  History, 
  ArrowUpRight, 
  Undo2, 
  Calendar, 
  User as UserIcon, 
  Search,
  Box,
  Layers,
  X,
  FileText
} from 'lucide-react-native';

const getAPIHost = () => {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return 'http://localhost:3000';
  return 'http://10.0.2.2:3000';
};

const theme = {
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    slate: { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 800: '#1E293B', 900: '#0F172A' },
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 600: '#2563EB' },
    emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 600: '#059669', 700: '#047857' },
    rose: { 50: '#FFF1F2', 100: '#FFE4E6', 600: '#E11D48', 700: '#BE123C' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 600: '#D97706', 700: '#B45309' }
  },
  spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 }
};

export default function HistoricoScreen() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [filter, setFilter] = useState('TODOS');
  const [search, setSearch] = useState('');

  const fetchHistorico = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${getAPIHost()}/api/historico`, {
        headers: { 'x-mobile-app': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setMovimentacoes(data || []);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  const filteredData = movimentacoes.filter(item => {
    if (filter !== 'TODOS') {
      const setor = item.solicitante?.setor || '';
      if (setor.toLowerCase() !== filter.toLowerCase()) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchId = item.id.toString().includes(q);
      const matchName = item.solicitante?.nome?.toLowerCase().includes(q);
      const matchSetor = item.solicitante?.setor?.toLowerCase().includes(q);
      const matchMotivo = item.motivo?.toLowerCase().includes(q);
      const matchItem = item.itens?.some(i => i.nome.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q));
      return matchId || matchName || matchSetor || matchMotivo || matchItem;
    }
    return true;
  });

  const renderItem = ({ item }) => {
    const isSaida = item.tipo === 'SAIDA';
    
    const colorTheme = isSaida ? theme.colors.blue : theme.colors.rose;
    const IconComponent = isSaida ? ArrowUpRight : Undo2;

    const dataObj = new Date(item.data);
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => setSelectedItem(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: colorTheme[50] }]}>
              <IconComponent size={20} color={colorTheme[600]} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.tipoTexto}>{isSaida ? 'Saída de Estoque' : 'Estorno / Devolução'}</Text>
              <Text style={styles.idTexto}>#{item.id.toString().padStart(4, '0')} • {dataFormatada} às {horaFormatada}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: colorTheme[50], borderColor: colorTheme[100] }]}>
            <Text style={[styles.badgeText, { color: colorTheme[700] }]}>
              {isSaida ? '-' : '+'}{item.totalQuantidade}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <UserIcon size={14} color={theme.colors.slate[400]} />
            <Text style={styles.infoText}>
              {item.solicitante?.nome || 'Operador'} 
              {item.solicitante?.setor ? ` • ${item.solicitante.setor}` : ''}
            </Text>
          </View>
          
          {item.motivo && (
            <View style={[styles.infoRow, { marginTop: 6 }]}>
              <History size={14} color={theme.colors.slate[400]} />
              <Text style={styles.infoText} numberOfLines={1}>{item.motivo}</Text>
            </View>
          )}

          <View style={styles.itemList}>
            {(item.itens || []).slice(0, 3).map((i, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.dot} />
                <Text style={styles.itemQty}>{i.quantidade}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>{i.nome}</Text>
                <Text style={styles.itemCode}>{i.codigo}</Text>
              </View>
            ))}
            {(item.itens?.length > 3) && (
              <Text style={styles.moreItems}>+ {item.itens.length - 3} itens</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico</Text>
        <Text style={styles.headerSubtitle}>Últimas movimentações de estoque</Text>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: 16 }}>
        <View style={styles.searchWrap}>
          <Search color={theme.colors.slate[400]} size={18} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar por ID, operador, setor ou item..."
            placeholderTextColor={theme.colors.slate[400]}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.slate[400], letterSpacing: 0.5 }}>SETOR SOLICITANTE</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>Deslize ➔</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { id: 'TODOS', label: 'Todos', color: theme.colors.slate[800] },
              { id: 'Usinagem', label: 'Usinagem', color: '#0072BC' },
              { id: 'Logística', label: 'Logística', color: '#008C45' },
              { id: 'Manutenção', label: 'Manutenção', color: '#D32027' },
              { id: 'Montagem', label: 'Montagem', color: '#D4A017' }
            ].map(t => {
              const isActive = filter === t.id;
              return (
                <TouchableOpacity 
                  key={t.id}
                  style={[
                    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radii.md, borderWidth: 1 },
                    isActive ? { backgroundColor: t.color, borderColor: t.color } : { backgroundColor: '#FFF', borderColor: theme.colors.slate[200] }
                  ]}
                  onPress={() => setFilter(t.id)}
                >
                  <Text style={[
                    { fontSize: 12, fontWeight: '700' },
                    isActive ? { color: '#FFF' } : { color: theme.colors.slate[600] }
                  ]}>{t.label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={item => `${item.tipo}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistorico(true)} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Layers color={theme.colors.slate[300]} size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>Nenhum histórico</Text>
              <Text style={styles.emptyDesc}>As movimentações de estoque aparecerão aqui.</Text>
            </View>
          )
        }
      />
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {selectedItem.tipo === 'SAIDA' ? 'Saída de Estoque' : 'Estorno'} #{selectedItem.id.toString().padStart(4, '0')}
                    </Text>
                    <Text style={styles.modalDesc}>
                      {new Date(selectedItem.data).toLocaleDateString('pt-BR')} às {new Date(selectedItem.data).toLocaleTimeString('pt-BR')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeBtn}>
                    <X color={theme.colors.slate[500]} size={20} />
                  </TouchableOpacity>
                </View>
                
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.modalSectionTitle}>INFORMAÇÕES GERAIS</Text>
                  <View style={styles.modalInfoBox}>
                    <View style={styles.modalInfoRow}>
                      <UserIcon size={14} color={theme.colors.slate[500]} />
                      <Text style={styles.modalInfoText}>Operador: {selectedItem.solicitante?.nome || 'N/A'}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Box size={14} color={theme.colors.slate[500]} />
                      <Text style={styles.modalInfoText}>Setor: {selectedItem.solicitante?.setor || 'N/A'}</Text>
                    </View>
                    {selectedItem.motivo && (
                      <View style={styles.modalInfoRow}>
                        <FileText size={14} color={theme.colors.slate[500]} />
                        <Text style={styles.modalInfoText}>Obs: {selectedItem.motivo}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>ITENS MOVIMENTADOS ({selectedItem.totalQuantidade} total)</Text>
                <FlatList
                  data={selectedItem.itens}
                  keyExtractor={i => i.id.toString()}
                  style={{ maxHeight: 300 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: i }) => (
                    <View style={styles.modalItemBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemName} numberOfLines={2}>{i.nome}</Text>
                        <Text style={styles.modalItemCode}>{i.codigo} • {i.localizacao}</Text>
                      </View>
                      <View style={styles.modalItemQtyBox}>
                        <Text style={[styles.modalItemQty, { color: selectedItem.tipo === 'SAIDA' ? theme.colors.blue[700] : theme.colors.rose[700] }]}>
                          {i.quantidadeEfetiva || i.quantidade} {i.unidade}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: theme.colors.slate[900], letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: theme.colors.slate[500], marginTop: 4 },
  
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: theme.colors.slate[200], borderRadius: theme.radii.lg, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.slate[800], fontWeight: '500' },
  
  topTabsWrap: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: theme.radii.lg, padding: 4, borderWidth: 1, borderColor: theme.colors.slate[200] },
  topTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: theme.radii.md },
  topTabActive: { backgroundColor: theme.colors.slate[100] },
  topTabText: { fontSize: 13, fontWeight: '700', color: theme.colors.slate[500] },
  topTabTextActive: { color: theme.colors.slate[900] },

  listContent: { padding: theme.spacing.lg, paddingTop: 0, paddingBottom: 40 },
  
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100]
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  tipoTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.slate[800]
  },
  idTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate[500],
    marginTop: 2
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  cardBody: {
    paddingTop: 4
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.slate[600],
    marginLeft: 8,
    fontWeight: '500',
    flex: 1
  },
  itemList: {
    marginTop: 12,
    backgroundColor: theme.colors.slate[50],
    borderRadius: theme.radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.slate[100]
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.slate[300],
    marginRight: 8
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.slate[800],
    width: 32
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.slate[600],
    fontWeight: '500',
    marginRight: 8
  },
  itemCode: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate[400],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  moreItems: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate[400],
    marginTop: 4,
    marginLeft: 12
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.slate[800],
    marginBottom: 8
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.slate[500],
    textAlign: 'center'
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.slate[900] },
  modalDesc: { fontSize: 13, color: theme.colors.slate[500], marginTop: 4, fontWeight: '600' },
  closeBtn: { backgroundColor: theme.colors.slate[100], padding: 6, borderRadius: theme.radii.full },
  
  modalSectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.slate[400], letterSpacing: 0.5, marginBottom: 8 },
  modalInfoBox: { backgroundColor: theme.colors.slate[50], padding: 12, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.slate[100] },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  modalInfoText: { fontSize: 13, color: theme.colors.slate[700], marginLeft: 8, fontWeight: '600' },
  
  modalItemBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] },
  modalItemName: { fontSize: 13, fontWeight: '700', color: theme.colors.slate[800], marginBottom: 4 },
  modalItemCode: { fontSize: 11, fontWeight: '600', color: theme.colors.slate[500] },
  modalItemQtyBox: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.slate[50], borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.slate[200], marginLeft: 12 },
  modalItemQty: { fontSize: 14, fontWeight: '900' }
});
