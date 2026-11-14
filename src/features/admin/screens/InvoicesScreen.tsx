import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { InvoiceRow } from '@/features/invoices/components/InvoiceRow';
import { KIND_FILTERS } from '@/features/invoices/lib/invoices';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { InvoiceService } from '@/services/invoice-service';
import type { InvoiceFilter, InvoiceKind } from '@/types/invoice';
import { ListFooter, consoleStyles, errorText } from '../components/parts';

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

/** Digits are an order number; anything else is an exact document number such as INV/26-27/00001. */
const searchOf = (text: string): InvoiceFilter => {
  const q = text.trim();
  if (!q) return {};
  return /^[1-9]\d{0,9}$/.test(q) ? { orderNo: Number(q) } : { number: q.toUpperCase().slice(0, 16) };
};

function Results({ filter }: { filter: InvoiceFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => InvoiceService.list(token, 'staff', filter, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={72} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load invoices" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(d) => d.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title="No documents here"
          message={filter.number || filter.orderNo ? 'Check the number. Document numbers look like INV/26-27/00001.' : 'Invoices and credit notes show up here as orders are paid and refunded.'}
        />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item }) => (
        <InvoiceRow
          doc={{ ...item, total: item.totals.total }}
          detail={`${item.issuer === 'ruxstar' ? 'Ruxstar' : item.business.name} · #${item.order.orderNo}`}
          onPress={() => router.push({ pathname: '/(admin)/invoices/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** Every GST invoice, bill of supply and credit note, newest first; find one by its number or its order number. */
export function InvoicesScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<InvoiceKind | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: InvoiceFilter = { ...searchOf(q), ...(kind === 'all' ? {} : { kind }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Invoices" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <View style={consoleStyles.pad}>
          <InputField
            value={text}
            onChangeText={setText}
            placeholder="Document number or order number"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search by document number or order number"
            hint="For example INV/26-27/00001, or 1042 for an order."
          />
        </View>
        <ChoiceChips options={KIND_FILTERS} value={kind} onChange={setKind} />
      </View>
      <Results key={`${q}|${kind}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingBottom: Spacing.two },
});
