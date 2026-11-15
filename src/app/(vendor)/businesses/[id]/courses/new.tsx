import { useLocalSearchParams } from 'expo-router';
import { CourseFormScreen } from '@/features/coaching/screens/CourseFormScreen';

/** The business id comes in as `id`; the form reads it as `businessId`. */
export default function NewCourseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseFormScreen businessId={id} />;
}
