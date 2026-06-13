/**
 * Register — Vendor Business Details · CRED-style
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Pressable, TouchableWithoutFeedback, Keyboard,
  Modal, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

const CATEGORIES = [
  'Retail & Shopping', 'Food & Restaurants', 'Beauty & Wellness',
  'Health & Medical', 'Home Services', 'Education & Tutoring',
  'Automotive', 'Sports & Fitness', 'Technology', 'Creative & Design',
  'Logistics & Delivery', 'Real Estate', 'Events & Entertainment',
  'Travel & Tourism', 'Finance & Insurance', 'Agriculture & Farming',
  'Manufacturing', 'Digital Services', 'Construction & Engineering', 'Gifts & Specialties',
];

export default function VendorDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string; email?: string; dob?: string }>();
  const { setAuth, pendingPhone, setLoading, isLoading } = useAuthStore();

  const [businessName, setBusinessName]           = useState('');
  const [category,     setCategory]               = useState('');
  const [gst,          setGst]                    = useState('');
  const [businessError, setBusinessError]         = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const canProceed = businessName.trim().length >= 2 && category.length > 0;

  const handleComplete = async () => {
    if (!businessName.trim()) { setBusinessError('Enter your business name'); return; }
    if (!category) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setAuth({
      token: 'demo-vendor-token-' + Date.now(),
      userId: 'vendor-' + Date.now(),
      role: 'vendor',
      phone: pendingPhone ?? '',
      name: params.name?.trim() ?? 'Vendor User',
    });
    setLoading(false);
    router.replace('/(vendor)');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.titleSection}>
              <Text style={styles.title}>Your{'\n'}business.</Text>
              <Text style={styles.subtitle}>This helps customers find and trust you</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(340).duration(500)} style={styles.form}>
              <InputField
                label="Business Name"
                required
                value={businessName}
                onChangeText={(t) => { setBusinessName(t); setBusinessError(''); }}
                error={businessError}
                placeholder="Your business name"
                autoCapitalize="words"
              />

              {/* Category picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category <Text style={styles.required}>*</Text></Text>
                <Pressable
                  onPress={() => setShowCategoryPicker(true)}
                  style={[styles.categoryBtn, category && styles.categoryBtnFilled]}>
                  <Text style={category ? styles.categoryValue : styles.categoryPlaceholder}>
                    {category || 'Select business category'}
                  </Text>
                  <Text style={styles.chevron}>▾</Text>
                </Pressable>
              </View>

              <InputField
                label="GST Number"
                value={gst}
                onChangeText={setGst}
                placeholder="22AAAAA0000A1Z5 (optional)"
                autoCapitalize="characters"
                maxLength={15}
                helper="Required for tax invoices"
              />
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(470).duration(500)}>
              <PrimaryButton
                label="Complete Setup"
                onPress={handleComplete}
                isLoading={isLoading}
                disabled={!canProceed}
                icon="→"
              />
            </Animated.View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={showCategoryPicker} animationType="slide" transparent onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={8}>
                <Text style={styles.modalClose}>x</Text>
              </Pressable>
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.categoryItem, item === category && styles.categoryItemActive]}
                  onPress={() => { setCategory(item); setShowCategoryPicker(false); }}>
                  <Text style={[styles.categoryItemText, item === category && styles.categoryItemTextActive]}>
                    {item}
                  </Text>
                  {item === category && <View style={styles.categoryCheck} />}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.four },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: Brand.cream, fontSize: 18, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.border2 },
  stepDotActive: { backgroundColor: Brand.primary, width: 22, borderRadius: 4 },

  titleSection: { gap: Spacing.two },
  title: {
    color: Brand.cream, fontSize: 44, fontWeight: '800',
    letterSpacing: -1.5, lineHeight: 50,
  },
  subtitle: { color: Brand.creamSub, fontSize: 16, lineHeight: 24 },

  form: { gap: Spacing.three },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    color: Brand.creamMuted, fontSize: 11, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  required: { color: Brand.error },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    borderRadius: Radius.md, paddingHorizontal: Spacing.three,
    paddingVertical: 16, minHeight: 58,
  },
  categoryBtnFilled: { borderColor: Brand.border3 },
  categoryPlaceholder: { color: Brand.creamMuted, fontSize: 17, flex: 1 },
  categoryValue: { color: Brand.cream, fontSize: 17, fontWeight: '500', flex: 1 },
  chevron: { color: Brand.creamMuted, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: Brand.surface2,
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    maxHeight: '75%',
    borderTopWidth: 1, borderColor: Brand.border2,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.two,
  },
  modalTitle: { color: Brand.cream, fontSize: 18, fontWeight: '700' },
  modalClose: { color: Brand.creamSub, fontSize: 20, fontWeight: '300' },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },
  categoryItemActive: { backgroundColor: Brand.primaryGlow },
  categoryItemText: { color: Brand.creamSub, fontSize: 16, flex: 1 },
  categoryItemTextActive: { color: Brand.cream, fontWeight: '600' },
  categoryCheck: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.primary,
  },
});
