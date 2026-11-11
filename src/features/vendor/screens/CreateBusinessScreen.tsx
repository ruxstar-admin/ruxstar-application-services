import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { BUSINESS_MODULES } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { BusinessService } from '@/services/business-service';
import type { BusinessModule, ModuleChoice } from '@/types/business';

function ModuleOption({ choice, selected, onPress }: { choice: ModuleChoice; selected: boolean; onPress: () => void }) {
  const info = BUSINESS_MODULES[choice.module];
  const closed = !choice.signupsOpen;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: closed }}
      disabled={closed}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, closed && styles.optionClosed, pressed && styles.pressed]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name={info.icon} size={22} color={selected ? Brand.onAction : Brand.text} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{info.label}</Text>
        <Text style={styles.muted}>{closed ? (choice.live ? 'Not taking new businesses right now' : 'Coming soon') : info.blurb}</Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={Brand.text} /> : null}
    </Pressable>
  );
}

/** Pick one module and a name; the business starts as a draft you then fill in and publish. */
export function CreateBusinessScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => BusinessService.modules(token));
  const [module, setModule] = useState<BusinessModule | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per attempt to create, so a retry after a dropped connection can't make two.
  const attempt = useRef(newIdempotencyKey());

  const create = async () => {
    if (!module) return;
    if (name.trim().length < 2) return setNameError('Enter the business name.');
    setSaving(true);
    setFailure(null);
    try {
      const business = await BusinessService.create(token, module, name.trim(), attempt.current);
      Feedback.success();
      router.replace({ pathname: '/(vendor)/businesses/[id]', params: { id: business.id } });
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.kind !== 'network' && err.kind !== 'timeout') attempt.current = newIdempotencyKey();
      setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not create it. Check your connection and try again.');
      if (err instanceof ApiError && (err.code === 'MODULE_OFF' || err.code === 'SIGNUPS_CLOSED')) reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      title="New business"
      footer={<PrimaryButton label="Create business" loading={saving} disabled={!module || !name.trim()} onPress={create} />}
    >
      <Text style={styles.intro}>Each business runs in one module. Start it here, then add its details and photos and publish it.</Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <View style={styles.options}>
            {data.map((choice) => (
              <ModuleOption
                key={choice.module}
                choice={choice}
                selected={module === choice.module}
                onPress={() => {
                  Feedback.select();
                  setModule(choice.module);
                }}
              />
            ))}
          </View>
        ) : null}
      </AsyncBoundary>
      <InputField
        label="Business name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(null);
        }}
        placeholder="For example Rao Prints"
        autoCapitalize="words"
        autoComplete="organization"
        maxLength={80}
        error={nameError ?? undefined}
      />
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  options: { gap: Spacing.two, marginBottom: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  optionSelected: { borderColor: Brand.text },
  optionClosed: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  optionIconSelected: { backgroundColor: Brand.action },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
});
