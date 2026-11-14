import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SelectField } from '@/components/ui/SelectField';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { SupportService } from '@/services/support-service';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { SupportCategory, SupportContextType, TicketDetail } from '@/types/support';
import { PickedPhotos } from '../components/parts';
import { useSupportSession } from '../hooks/use-support-session';
import { attachPhotos, pickPhotos } from '../lib/photos';
import { CATEGORIES, CATEGORY_LABEL, PHOTOS_MAX, SUBJECT_MAX, SUBJECT_MIN, TEXT_MAX, supportErrorText, type NewTicketParams } from '../lib/support';

const CONTEXT_TYPES: readonly SupportContextType[] = ['order', 'business', 'verification', 'post', 'coupon'];
const isCategory = (value?: string): value is SupportCategory => !!value && Object.hasOwn(CATEGORY_LABEL, value);

/**
 * A new help ticket: topic, a short subject, what happened, and up to 3 photos. "Contact support" links fill in the
 * topic and what it is about (an order, business, coupon or verification).
 */
export function NewTicketScreen() {
  const router = useRouter();
  const { token, routes } = useSupportSession();
  const params = useLocalSearchParams<{ [K in keyof NewTicketParams]?: string }>();
  const context =
    params.contextType && params.contextId && (CONTEXT_TYPES as readonly string[]).includes(params.contextType)
      ? { type: params.contextType as SupportContextType, id: params.contextId, label: params.contextLabel }
      : null;

  const [category, setCategory] = useState<SupportCategory | null>(isCategory(params.category) ? params.category : null);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const canSend = !!category && subject.trim().length >= SUBJECT_MIN && text.trim().length > 0;

  const addPhotos = async () => {
    const picked = await pickPhotos(PHOTOS_MAX - photos.length);
    if (picked.length) setPhotos((prev) => [...prev, ...picked].slice(0, PHOTOS_MAX));
  };

  const send = async () => {
    if (!category || !canSend) return;
    setSending(true);
    setError(null);
    let created: TicketDetail;
    try {
      created = await SupportService.create(
        token,
        { category, subject: subject.trim(), text: text.trim(), ...(context ? { context: { type: context.type, id: context.id } } : {}) },
        key.current,
      );
    } catch (err) {
      Feedback.error();
      setError(supportErrorText(err));
      setSending(false);
      return;
    }
    key.current = newIdempotencyKey();
    try {
      await attachPhotos(token, created, photos);
    } catch {
      // The ticket is open; the thread says which photos made it.
      Feedback.error();
    }
    Feedback.success();
    setSending(false);
    router.replace(routes.ticket(created.id));
  };

  return (
    <ScreenContainer title="Message support" footer={<PrimaryButton label="Send" onPress={send} loading={sending} disabled={!canSend} />}>
      {context ? (
        <View style={styles.about}>
          <Ionicons name="link-outline" size={18} color={Brand.textMuted} />
          <Text style={styles.aboutText} numberOfLines={1}>
            {`About ${context.label ?? 'this'}`}
          </Text>
        </View>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <SelectField
        label="Topic"
        value={category ? CATEGORY_LABEL[category] : ''}
        options={CATEGORIES.map((c) => c.label)}
        onChange={(label) => setCategory(CATEGORIES.find((c) => c.label === label)?.key ?? null)}
        placeholder="What is it about?"
      />
      <InputField label="Subject" value={subject} onChangeText={setSubject} maxLength={SUBJECT_MAX} placeholder="For example: Payment taken but no order" />
      <InputField
        label="What happened?"
        value={text}
        onChangeText={setText}
        maxLength={TEXT_MAX}
        multiline
        showCount
        placeholder="Tell us what you expected and what happened instead. Order numbers and dates help."
      />
      <Text style={styles.label}>Photos (optional)</Text>
      <PickedPhotos photos={photos} onAdd={addPhotos} onRemove={(i) => setPhotos((prev) => prev.filter((_, j) => j !== i))} disabled={sending} />
      <Text style={styles.hint}>Screenshots of an error or a photo of the problem. Only you and the Ruxstar team can see them.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  about: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  aboutText: { ...Typography.body, flex: 1, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.two },
  hint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
});
