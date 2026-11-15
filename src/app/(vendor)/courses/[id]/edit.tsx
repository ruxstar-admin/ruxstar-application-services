import { useLocalSearchParams } from 'expo-router';
import { CourseFormScreen } from '@/features/coaching/screens/CourseFormScreen';

export default function EditCourseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseFormScreen courseId={id} />;
}
