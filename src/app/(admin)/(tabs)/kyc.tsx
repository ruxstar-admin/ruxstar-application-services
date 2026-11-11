import { Needs } from '@/features/admin/components/parts';
import { KycReviewScreen } from '@/features/admin/screens/KycReviewScreen';

export default function KycTab() {
  return (
    <Needs need="kyc.view">
      <KycReviewScreen />
    </Needs>
  );
}
