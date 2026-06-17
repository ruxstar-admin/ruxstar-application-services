/**
 * AddBusinessModal
 * Bottom-sheet style modal for adding a new business.
 * Fields: name (required), category (picker), phone, address, description.
 * Mirrors the web's businesses page add-business form.
 */

import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, FlatList,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { BUSINESS_CATEGORIES, type BusinessFormData } from '@/types/vendor';

const empty: BusinessFormData = {
  name:        '',
  category:    '',
  phone:       '',
  address:     '',
  description: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  visible:   boolean;
  onClose:   () => void;
  onSubmit:  (form: BusinessFormData) => Promise<void>;
};

export default function AddBusinessModal({ visible, onClose, onSubmit }: Props) {
  const [form,      setForm]      = useState<BusinessFormData>(empty);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  function patch(key: keyof BusinessFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError('');
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Business name is required.'); return; }
    if (!form.category)    { setError('Please select a category.'); return; }
    if (form.phone && !/^\d{0,10}$/.test(form.phone)) {
      setError('Phone must be up to 10 digits.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
      setForm(empty);
      setError('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setForm(empty);
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kav}
        >
          <Animated.View entering={SlideInDown.springify().damping(18)} style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Business</Text>
              <Pressable onPress={handleClose} style={s.closeBtn} disabled={loading}>
                <Text style={s.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s.formScroll}
              contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">

              {/* Business Name */}
              <Field label="Business Name *">
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
              <Field label="Category *">
                <Pressable
                  style={[s.input, s.picker]}
                  onPress={() => setShowCatPicker(true)}
                >
                  <Text style={form.category ? s.pickerValue : s.pickerPlaceholder}>
                    {form.category || 'Select a category'}
                  </Text>
                  <Text style={s.pickerArrow}>▾</Text>
                </Pressable>
              </Field>

              {/* Phone */}
              <Field label="Phone (optional)">
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
              <Field label="Address (optional)">
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
              <Field label="About (optional)">
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="A short description of your business…"
                  placeholderTextColor={Brand.creamMuted}
                  value={form.description}
                  onChangeText={(v) => patch('description', v)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </Field>

              {/* Error */}
              {error ? <Text style={s.error}>{error}</Text> : null}

              {/* Actions */}
              <View style={s.actions}>
                <Pressable style={s.cancelBtn} onPress={handleClose} disabled={loading}>
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.submitBtn, loading && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitText}>Add Business</Text>
                  }
                </Pressable>
              </View>

            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Category picker modal */}
      <CategoryPicker
        visible={showCatPicker}
        selected={form.category}
        onSelect={(cat) => { patch('category', cat); setShowCatPicker(false); }}
        onClose={() => setShowCatPicker(false)}
      />
    </Modal>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Category Picker ──────────────────────────────────────────────────────────

function CategoryPicker({
  visible, selected, onSelect, onClose,
}: {
  visible:  boolean;
  selected: string;
  onSelect: (cat: string) => void;
  onClose:  () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cp.overlay}>
        <View style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.title}>Select Category</Text>
            <Pressable onPress={onClose} style={cp.closeBtn}>
              <Text style={cp.closeBtnText}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={BUSINESS_CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[cp.item, item === selected && cp.itemSelected]}
                onPress={() => onSelect(item)}
              >
                <Text style={[cp.itemText, item === selected && cp.itemTextSelected]}>
                  {item}
                </Text>
                {item === selected && <Text style={cp.check}>✓</Text>}
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Brand.bg,
    borderTopLeftRadius:  Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '92%',
    paddingHorizontal: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Brand.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'space-between',
    paddingVertical: Spacing.three,
  },
  sheetTitle: {
    color: Brand.cream, fontSize: 18, fontWeight: '800', letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: Brand.creamSub, fontSize: 14, fontWeight: '700' },

  formScroll: { flexGrow: 0 },
  formContent: { gap: Spacing.three, paddingBottom: Spacing.two },

  field: { gap: 6 },
  fieldLabel: { color: Brand.creamSub, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  input: {
    backgroundColor: Brand.surface1,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Brand.border2,
    paddingHorizontal: Spacing.three,
    paddingVertical:   12,
    color:           Brand.cream,
    fontSize:        15,
  },
  textarea: { minHeight: 80, paddingTop: 12 },

  picker: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'space-between',
  },
  pickerValue:       { color: Brand.cream,     fontSize: 15 },
  pickerPlaceholder: { color: Brand.creamMuted, fontSize: 15 },
  pickerArrow:       { color: Brand.creamMuted, fontSize: 14 },

  error: {
    color: Brand.error, fontSize: 13, textAlign: 'center',
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: Radius.md,
    padding: Spacing.two,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.20)',
  },

  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border2,
    alignItems: 'center',
  },
  cancelText: { color: Brand.creamSub, fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const cp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor:    Brand.bg,
    borderTopLeftRadius:  Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '70%',
    paddingHorizontal: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  title: { color: Brand.cream, fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: Brand.creamSub, fontSize: 14, fontWeight: '700' },
  item: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  itemSelected: { backgroundColor: Brand.primaryGlow },
  itemText:     { color: Brand.cream, fontSize: 15 },
  itemTextSelected: { color: Brand.primary, fontWeight: '700' },
  check: { color: Brand.primary, fontSize: 16, fontWeight: '700' },
});
