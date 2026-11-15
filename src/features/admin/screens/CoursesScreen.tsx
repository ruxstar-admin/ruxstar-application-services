import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { CATEGORY_LABEL, COURSE_STATUS, MODE_LABEL } from '@/features/coaching/lib/coaching';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { AdminService } from '@/services/admin-service';
import type { CourseFilter } from '@/types/admin';
import type { VendorCourse } from '@/types/coaching';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

type Status = NonNullable<CourseFilter['status']>;

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'removed', label: 'Taken down' },
] as const satisfies readonly { key: Status | 'all'; label: string }[];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

const summary = (c: VendorCourse) =>
  [c.business.name, `${CATEGORY_LABEL[c.category]}, ${MODE_LABEL[c.mode].toLowerCase()}`, c.status === 'draft' ? 'Not published' : `${c.counts.students} students`].join(' · ');

function Results({ filter }: { filter: CourseFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.courses(token, filter, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load courses" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="school-outline" title="No courses here" message={filter.q ? 'Try another word from the course name or the institute’s name.' : 'Courses institutes make show up here.'} />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: c }) => (
        <Card>
          <Row
            name={c.title}
            avatarUrl={c.photo?.url}
            title={c.title}
            subtitle={summary(c)}
            right={<Badge {...COURSE_STATUS[c.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/course/[id]', params: { id: c.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every institute's courses, newest first, searchable by name and filtered by status. */
export function CoursesScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: CourseFilter = { ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Courses" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="Course or institute name"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Search courses"
        />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
      </View>
      <Results key={`${q}|${status}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
