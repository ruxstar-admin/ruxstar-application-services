import { Needs } from '@/features/admin/components/parts';
import { CoursesScreen } from '@/features/admin/screens/CoursesScreen';

export default function CoursesRoute() {
  return (
    <Needs need="businesses.view">
      <CoursesScreen />
    </Needs>
  );
}
