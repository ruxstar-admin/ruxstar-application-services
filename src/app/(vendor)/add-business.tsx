/**
 * Add Business — full-screen form
 * Navigated to from Businesses screen via router.push
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessStore } from '@/stores/business-store';
import { BUSINESS_CATEGORIES, type BusinessFormData } from '@/types/vendor';

const empty: BusinessFormData = {
  name: '', category: '', phone: '', address: '', description: '',
};

export default function AddBusinessScreen() {
  const insets  = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const addBusiness = useBusinessStore((s) => s.addBusiness);

  const [form,    setForm]    = useState<BusinessFormData>(empty);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showCat, setShowCat] = useState(false);

  function patch(key: keyof BusinessFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError('');
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Business name is required.'); return; }
    if (!form.category)    { setError('Please select a category.');  return; }
    if (form.phone && !/^\d{0,10}$/.test(form.phone)) {
      setError('Phone must be up to 10 digits.'); return;
    }

    setLoading(true);
    try {
      await addBusiness(userId!, form);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8} disabled={loading}>
          <Ionicons name="arrow-back" size={22} color={Brand.cream} />
        </Pressable>
        <Text style={s.headerTitle}>Add Business</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Business Name */}
          <Field label="Business Name" required>
            <TextInput
              style={s.input}
              placeholder="e.g. Sunrise Cafe"
              placeholderTextColor={Brand.creamMuted}
              value={form.name}
              onChangeText={(v) => patch('name', v)}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!loading}
            />
          </Field>

          {/* Category */}
          <Field label="Category" required>
            <Pressable
              style={[s.input, s.selectRow]}
              onPress={() => setShowCat(true)}
              disabled={loading}
            >
              <Text style={form.category ? s.selectValue : s.selectPlaceholder}>
                {form.category || 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Brand.creamMuted} />
            </Pressable>
          </Field>

          {/* Phone */}
          <Field label="Phone" hint="Optional">
            <TextInput
              style={s.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={Brand.creamMuted}
              value={form.phone}
              onChangeText={(v) => patch('phone', v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="next"
              editable={!loading}
            />
          </Field>

          {/* Address */}
          <Field label="Address" hint="Optional">
            <TextInput
              style={s.input}
              placeholder="Street, area, city"
              placeholderTextColor={Brand.creamMuted}
              value={form.address}
              onChangeText={(v) => patch('address', v)}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!loading}
            />
          </Field>

          {/* Description */}
          <Field label="About" hint="Optional">
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="A short description of your business…"
              placeholderTextColor={Brand.creamMuted}
              value={form.description}
              onChangeText={(v) => patch('description', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </Field>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Brand.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky bottom actions */}
        <View style={[s.actions, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.submitBtn, loading && s.submitDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={s.submitText}>Add Business</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Category picker */}
      <CategoryPicker
        visible={showCat}
        selected={form.category}
        onSelect={(cat) => { patch('category', cat); setShowCat(false); }}
        onClose={() => setShowCat(false)}
      />
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <View style={s.fieldLabelRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {required && <Text style={s.required}>Required</Text>}
        {hint && !required && <Text style={s.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

// ─── Category Picker ──────────────────────────────────────────────────────────

function CategoryPicker({
  visible, selected, onSelect, onClose,
}: {
  visible: boolean; selected: string;
  onSelect: (c: string) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cp.backdrop} onPress={onClose} />
      <View style={[cp.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={cp.handle} />

        {/* Header */}
        <View style={cp.header}>
          <Text style={cp.title}>Select Category</Text>
          <Pressable style={cp.closeBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={Brand.creamSub} />
          </Pressable>
        </View>

        <FlatList
          data={BUSINESS_CATEGORIES}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                cp.item,
                item === selected && cp.itemActive,
                pressed && { backgroundColor: Brand.surface2 },
              ]}
              onPress={() => onSelect(item)}
            >
              <Text style={[cp.itemText, item === selected && cp.itemTextActive]}>
                {item}
              </Text>
              {item === selected && (
                <Ionicons name="checkmark" size={18} color={Brand.primary} />
              )}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  kav:  { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    backgroundColor: Brand.surface1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: Brand.cream, fontSize: 17, fontWeight: '700', letterSpacing: -0.3,
  },

  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },

  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { color: Brand.cream, fontSize: 14, fontWeight: '600' },
  required:   { color: Brand.primary, fontSize: 11, fontWeight: '600' },
  hint:       { color: Brand.creamMuted, fontSize: 11 },

  input: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    color: Brand.cream,
    fontSize: 15,
  },
  textarea: { minHeight: 100, paddingTop: 14 },

  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue:       { color: Brand.cream,     fontSize: 15, flex: 1 },
  selectPlaceholder: { color: Brand.creamMuted, fontSize: 15, flex: 1 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    padding: Spacing.three,
  },
  errorText: { color: Brand.error, fontSize: 13, flex: 1, lineHeight: 18 },

  // Sticky bottom
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Brand.border1,
    backgroundColor: Brand.bg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: Brand.creamSub, fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const cp = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Brand.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
    paddingHorizontal: Spacing.four,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Brand.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  title:    { color: Brand.cream, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  itemActive:     { backgroundColor: Brand.primaryGlow },
  itemText:       { color: Brand.cream, fontSize: 15 },
  itemTextActive: { color: Brand.primary, fontWeight: '700' },
});
