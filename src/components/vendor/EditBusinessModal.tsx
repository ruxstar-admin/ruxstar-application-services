/**
 * EditBusinessModal
 * Bottom-sheet form to edit an existing business's profile — name, phone,
 * address, description. Mirrors the web's BusinessProfileDialog: category/type
 * isn't editable here (it drives the whole setup flow), only the profile
 * fields customers see. Lets a vendor fix these without deleting and
 * recreating the business.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import type { Business, BusinessProfilePatch } from '@/services/vendor-business-service';

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: brand.bg,
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    maxHeight: '92%', paddingHorizontal: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: {
    width: 40, height: 4, backgroundColor: brand.border2, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three },
  sheetTitle: { color: brand.cream, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.surface2, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: brand.creamSub, fontSize: 14, fontWeight: '700' },

  formScroll: { flexGrow: 0 },
  formContent: { gap: Spacing.three, paddingBottom: Spacing.two },

  field: { gap: 6 },
  fieldLabel: { color: brand.creamSub, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  input: {
    backgroundColor: brand.surface1, borderRadius: Radius.md, borderWidth: 1, borderColor: brand.border2,
    paddingHorizontal: Spacing.three, paddingVertical: 12, color: brand.cream, fontSize: 15,
  },
  textarea: { minHeight: 90, paddingTop: 12 },

  error: {
    color: brand.error, fontSize: 13, textAlign: 'center',
    backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.20)',
  },

  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: brand.border2, alignItems: 'center' },
  cancelText: { color: brand.creamSub, fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: brand.primary, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}{hint ? ` — ${hint}` : ''}</Text>
      {children}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  business: Business;
  onClose:  () => void;
  onSubmit: (patch: BusinessProfilePatch) => Promise<void>;
};

export default function EditBusinessModal({ business, onClose, onSubmit }: Props) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [name,        setName]        = useState(business.name);
  const [phone,       setPhone]       = useState(business.phone);
  const [address,     setAddress]     = useState(business.address);
  const [description, setDescription] = useState(business.description);
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim())              { setError('Business name is required.'); return; }
    if (phone && !/^\d{10}$/.test(phone)) { setError('Phone must be a 10-digit number.'); return; }
    if (!description.trim())       { setError('Description is required.'); return; }

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        name:        name.trim(),
        phone:       phone.trim(),
        address:     address.trim(),
        description: description.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Animated.View entering={SlideInUp.duration(300)} style={s.sheet}>
            <View style={s.handle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Edit business</Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
                disabled={saving}
              >
                <Text style={s.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={s.formScroll}
              contentContainerStyle={s.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <Field label="Business name" hint="required">
                <TextInput
                  style={s.input}
                  placeholder="e.g. Sunrise Cafe"
                  placeholderTextColor={brand.creamMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!saving}
                />
              </Field>

              <Field label="Phone" hint="10-digit mobile">
                <TextInput
                  style={s.input}
                  placeholder="9876543210"
                  placeholderTextColor={brand.creamMuted}
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="next"
                  editable={!saving}
                />
              </Field>

              <Field label="Address">
                <TextInput
                  style={s.input}
                  placeholder="Street, area, city"
                  placeholderTextColor={brand.creamMuted}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!saving}
                />
              </Field>

              <Field label="Description" hint="required">
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="What you offer — keep it short and clear for customers"
                  placeholderTextColor={brand.creamMuted}
                  value={description}
                  onChangeText={(v) => setDescription(v.slice(0, 500))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!saving}
                />
              </Field>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <View style={s.actions}>
                <Pressable
                  style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleClose}
                  disabled={saving}
                >
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.submitBtn, saving && s.submitBtnDisabled, pressed && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitText}>Save changes</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
