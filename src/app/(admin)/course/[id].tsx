import { useLocalSearchParams } from 'expo-router';
import { Needs } from '@/features/admin/components/parts';
import { CourseCaseScreen } from '@/features/admin/screens/CourseCaseScreen';

export default function CourseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Needs need="businesses.view">
      <CourseCaseScreen id={id} />
    </Needs>
  );
}
