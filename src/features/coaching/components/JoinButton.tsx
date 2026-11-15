import { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { ClassView, CourseMode } from '@/types/coaching';
import { joinState, opensText } from '../lib/classes';

/**
 * The join button for an online class: shows when the link opens, then joins. The link only comes from the API once it's time,
 * so a screen left open asks for it again on tap.
 */
export function JoinButton({ orderId, cls, mode, now }: { orderId: string; cls: ClassView; mode: CourseMode; now: number }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const state = joinState(cls, mode, now);
  if (state.kind === 'none') return null;
  if (state.kind === 'later') return <Text style={styles.later}>{opensText(state.opensAt, now)}</Text>;

  const join = async () => {
    setFailure(null);
    let link = state.link;
    if (!link) {
      setBusy(true);
      try {
        link = (await CoachingService.order(token, orderId)).classes.find((c) => c.id === cls.id)?.joinLink ?? null;
      } catch (err) {
        setFailure(errorText(err));
      } finally {
        setBusy(false);
      }
    }
    if (!link) {
      Feedback.error();
      setFailure((f) => f ?? 'The institute hasn’t shared the link yet. Try again in a minute.');
      return;
    }
    Feedback.tap();
    await Linking.openURL(link);
  };

  return (
    <>
      <PrimaryButton label="Join class" loading={busy} onPress={join} />
      {failure ? <Text style={styles.failure}>{failure}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  later: { ...Typography.caption, color: Brand.textMuted },
  failure: { ...Typography.caption, color: Brand.error },
});
