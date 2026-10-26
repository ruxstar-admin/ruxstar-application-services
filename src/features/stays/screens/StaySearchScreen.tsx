import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DayPicker } from '@/components/ui/DayTimePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { addDays, nightsBetween } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { StaysService } from '@/services/stays-service';
import { FACILITIES, type FacilityKey, type StayResult } from '@/types/stays';

/** Find a stay by location, facilities and dates; only properties with a free bed for those nights are shown. */
export function StaySearchScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [q, setQ] = useState('');
  const [facilities, setFacilities] = useState<FacilityKey[]>([]);
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [results, setResults] = useState<StayResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  const changeFrom = (day: string) => {
    setFrom(day);
    if (to && to <= day) setTo(undefined);
  };

  const search = async () => {
    if (!from || !to) return;
    setSearching(true);
    setFailed(false);
    try {
      setResults(await StaysService.search(token, { q, facilities, from, to }));
      Feedback.select();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <ScreenContainer title="Find a stay" footer={<PrimaryButton label="Search" onPress={search} disabled={!from || !to} loading={searching} />}>
      <InputField label="Where" value={q} onChangeText={setQ} placeholder="Area or property, e.g. Madhapur" />

      <Text style={styles.label}>Facilities</Text>
      <MultiChoiceChips options={FACILITIES} value={facilities} onChange={setFacilities} />

      <Text style={styles.label}>Check-in</Text>
      <DayPicker value={from} onChange={changeFrom} />
      <Text style={styles.label}>Check-out</Text>
      <DayPicker value={to} onChange={setTo} from={from ? addDays(from, 1) : undefined} />

      {failed ? <EmptyState icon="cloud-offline-outline" title="Search failed" message="Check your connection and try again." /> : null}
      {results ? (
        <View style={styles.results}>
          <Text style={styles.label}>{`${results.length} stay${results.length === 1 ? '' : 's'} available`}</Text>
          {results.map((r) => (
            <ListRow
              key={r.property.id}
              icon="bed-outline"
              title={r.property.name}
              subtitle={`${r.property.area} · ${r.freeBeds} beds free · from ₹${r.fromRate} / night`}
              onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: r.property.id, from, to } })}
            />
          ))}
          {results.length === 0 ? <EmptyState icon="sad-outline" title="No stays available" message={`Nothing is free for ${from && to ? nightsBetween(from, to) : ''} night(s) with those filters. Try other dates.`} /> : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
  results: { gap: Spacing.one },
});
