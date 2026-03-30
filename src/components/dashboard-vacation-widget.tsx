import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { VacationHeroCard } from './vacation-hero-card';
import type { Vacation, VacationLifecycle, BookingTask } from '../types/vacation.types';
import type { PackingItem, PackingStatus } from '../types/packing.types';

const BAR_COLORS: Record<PackingStatus, string> = {
  new: '#757575',
  buy: '#F59300',
  ready: '#1976D2',
  issue: '#D32F2F',
  last_minute: '#00897B',
  packed: '#388E3C',
};

// Render order for bar segments (left to right)
const BAR_ORDER: PackingStatus[] = ['new', 'buy', 'issue', 'ready', 'last_minute', 'packed'];

interface DashboardVacationWidgetProps {
  vacation: Vacation;
  allTasks: BookingTask[];
  packingItems: PackingItem[];
  onPress: () => void;
  onLifecycleChange: (lifecycle: VacationLifecycle) => void;
}

export function DashboardVacationWidget({
  vacation,
  allTasks,
  packingItems,
  onPress,
  onLifecycleChange,
}: DashboardVacationWidgetProps) {
  // ── Task summary ──────────────────────────────────────────────────────
  const totalTasks = allTasks.length;
  const incomplete = allTasks.filter((t) => !t.isComplete);
  const incompleteCount = incomplete.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredCount = incomplete.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate + 'T00:00:00') < today;
  }).length;

  // ── Packing summary ───────────────────────────────────────────────────
  const total = packingItems.length;
  const packedCount = packingItems.filter((i) => i.status === 'packed').length;
  const buyCount = packingItems.filter((i) => i.status === 'buy').length;
  const issueCount = packingItems.filter((i) => i.status === 'issue').length;
  const hasNonNew = packingItems.some((i) => i.status !== 'new');
  const showPacking = total > 0 && (vacation.lifecycle === 'packing' || hasNonNew);

  // Count per status for bar
  const statusCounts: Record<PackingStatus, number> = {
    new: 0, buy: 0, ready: 0, issue: 0, last_minute: 0, packed: 0,
  };
  for (const item of packingItems) {
    statusCounts[item.status]++;
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.widget}>
      <VacationHeroCard
        vacation={vacation}
        onPress={onPress}
        onLifecycleChange={onLifecycleChange}
        height={120}
      />
      <View style={s.body}>
        {/* 1. Task summary */}
        {totalTasks > 0 && (
          <View style={s.row}>
            {incompleteCount === 0 ? (
              <>
                <Icon source="check-circle" size={16} color="#388E3C" />
                <Text style={[s.text, { color: '#388E3C' }]}>Todas as tarefas concluídas</Text>
              </>
            ) : expiredCount > 0 ? (
              <>
                <Icon source="alert-circle" size={16} color="#D32F2F" />
                <Text style={[s.text, { color: '#D32F2F' }]}>
                  {incompleteCount} {incompleteCount === 1 ? 'tarefa em falta' : 'tarefas em falta'}, das quais {expiredCount} em atraso
                </Text>
              </>
            ) : (
              <Text style={s.text}>
                {incompleteCount} {incompleteCount === 1 ? 'tarefa em falta' : 'tarefas em falta'}
              </Text>
            )}
          </View>
        )}

        {/* 2. Packing status bar */}
        {showPacking && (
          <>
            {packedCount === total ? (
              <View style={s.row}>
                <Icon source="check-circle" size={16} color="#388E3C" />
                <Text style={[s.text, { color: '#388E3C' }]}>Tudo embalado</Text>
              </View>
            ) : (
              <View style={s.bar}>
                {BAR_ORDER.map((status) => {
                  const count = statusCounts[status];
                  if (count === 0) return null;
                  const pct = (count / total) * 100;
                  return (
                    <View
                      key={status}
                      style={{ width: `${pct}%` as any, backgroundColor: BAR_COLORS[status], height: 8 }}
                    />
                  );
                })}
              </View>
            )}

            {/* 3. Items com problema */}
            {issueCount > 0 && (
              <View style={s.row}>
                <Icon source="alert-circle" size={14} color="#D32F2F" />
                <Text style={[s.text, { color: '#D32F2F' }]}>
                  {issueCount} {issueCount === 1 ? 'item com problema' : 'itens com problema'}
                </Text>
              </View>
            )}

            {/* 4. Items por comprar */}
            {buyCount > 0 && (
              <View style={s.row}>
                <Icon source="alert-circle" size={14} color="#D32F2F" />
                <Text style={[s.text, { color: '#D32F2F' }]}>
                  {buyCount} {buyCount === 1 ? 'item por comprar' : 'itens por comprar'}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  widget: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 2 },
  body: { padding: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 13, color: '#1A1A1A' },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
});
