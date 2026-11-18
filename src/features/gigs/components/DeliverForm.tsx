import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Typography } from '@/constants/theme';
import { Card } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { GigDeskService } from '@/services/gigs-service';
import type { GigOrder } from '@/types/gigs';
import { useGigLimits } from '../hooks/use-gigs';
import { deliveryErrors, linesOf } from '../lib/forms';
import { FilesField, fileIdsOf, filesReady, type HeldFile } from './FilesField';

/** Sending the work: a message for the customer, links, and files uploaded as they're picked. */
export function DeliverForm({
  order,
  maxMb,
  fileDays,
  onDelivered,
  onCancel,
}: {
  order: GigOrder;
  maxMb: number;
  fileDays: number;
  onDelivered: (o: GigOrder) => void;
  onCancel: () => void;
}) {
  const token = useAuthToken();
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState('');
  const [files, setFiles] = useState<HeldFile[]>([]);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());
  const linkList = linesOf(links);
  const errors = deliveryErrors(message, linkList, useGigLimits().links);

  const send = async () => {
    setShown(true);
    if (Object.keys(errors).length || !filesReady(files)) {
      Feedback.error();
      if (!filesReady(files)) setFailure('Wait for your files to finish sending, or remove the ones that failed.');
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = { message: message.trim(), links: linkList, fileIds: fileIdsOf(files) };
    try {
      const next = await GigDeskService.deliver(token, order.id, body, { idempotencyKey: attempt.current.keyFor(body) });
      attempt.current.settle();
      Feedback.success();
      onDelivered(next);
    } catch (err) {
      Feedback.error();
      attempt.current.settle(err);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={styles.strong}>{order.deliveries.length ? 'Deliver again' : 'Deliver the work'}</Text>
      <InputField
        label="Message for the customer"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        showCount
        placeholder="What you’re sending and how to use it"
        error={shown ? errors.message : undefined}
      />
      <InputField
        label="Links (optional)"
        value={links}
        onChangeText={setLinks}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="One per line, like a Drive or Figma link"
        error={shown ? errors.links : undefined}
      />
      <FilesField use="delivery" maxMb={maxMb} files={files} setFiles={setFiles} label="Files (optional)" />
      <Text style={styles.small}>{`The customer then approves it or asks for changes. Files are deleted ${fileDays} days after the order ends, so keep your own copy.`}</Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label="Send delivery" loading={busy} onPress={send} />
      <TextLink muted label="Not now" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
