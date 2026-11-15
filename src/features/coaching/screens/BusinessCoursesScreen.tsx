import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { VendorCoachingService } from '@/services/coaching-service';
import type { VendorCourse } from '@/types/coaching';
import { CATEGORY_LABEL, COURSE_STATUS, MODE_LABEL } from '../lib/coaching';

function courseLine(course: VendorCourse): string {
  if (course.status === 'draft') return course.missing.length ? `To do: ${course.missing[0]}` : 'Ready to publish';
  if (course.status === 'removed') return 'Taken down by Ruxstar';
  const open = course.batches.filter((b) => b.status === 'open' || b.status === 'full' || b.status === 'started').length;
  return `${open} ${open === 1 ? 'batch' : 'batches'} · ${course.counts.students} ${course.counts.students === 1 ? 'student' : 'students'}`;
}

function CourseRow({ course, onPress }: { course: VendorCourse; onPress: () => void }) {
  const status = COURSE_STATUS[course.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${status.label}, ${courseLine(course)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {course.title}
        </Text>
        <Text style={styles.small}>{`${CATEGORY_LABEL[course.category]} · ${MODE_LABEL[course.mode]}`}</Text>
        <Text style={styles.small}>{courseLine(course)}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** An institute's courses, newest first, and the way to make a new one. */
export function BusinessCoursesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = usePaginated(() => VendorCoachingService.list(token, id));
  useRefetchOnFocus(list.refresh);
  const create = () => router.push({ pathname: '/(vendor)/businesses/[id]/courses/new', params: { id } });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Courses" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your courses" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="school-outline"
              title="No courses yet"
              message="Make your first course, then add a batch with its weekly timetable. It’s a draft until you publish it."
              actionLabel="New course"
              onAction={create}
            />
          }
          renderItem={({ item }) => <CourseRow course={item} onPress={() => router.push({ pathname: '/(vendor)/courses/[id]', params: { id: item.id } })} />}
        />
      )}
      {list.items.length ? (
        <View style={styles.footer}>
          <PrimaryButton label="New course" onPress={create} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
