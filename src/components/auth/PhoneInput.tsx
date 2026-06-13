/**
 * PhoneInput — Country code + phone number field
 *
 * Features:
 *  • Country flag + dial code picker (modal)
 *  • Auto-formatted input
 *  • Numeric keyboard
 *  • Focus ring glow
 *  • Error state with message
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Platform,
  type TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { POPULAR_COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/constants/countries';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string, fullNumber: string) => void;
  onCountryChange?: (country: Country) => void;
  error?: string;
  placeholder?: string;
  editable?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function PhoneInput({
  value,
  onChangeText,
  onCountryChange,
  error,
  placeholder = 'Mobile number',
  editable = true,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const isFocused = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const filteredCountries = search.trim()
    ? POPULAR_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : POPULAR_COUNTRIES;

  const handleFocus = () => {
    isFocused.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    isFocused.value = withTiming(0, { duration: 200 });
  };

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? Brand.error
      : interpolateColor(
          isFocused.value,
          [0, 1],
          [Brand.surfaceCardBorder, Brand.primary],
        ),
  }));

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setShowPicker(false);
    setSearch('');
    onCountryChange?.(country);
    onChangeText(value, `${country.dialCode}${value}`);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '');
    onChangeText(digits, `${selectedCountry.dialCode}${digits}`);
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, borderAnimStyle, error && styles.errorBorder]}>
        {/* Country code button */}
        <Pressable
          style={styles.countryButton}
          onPress={() => setShowPicker(true)}
          disabled={!editable}
          accessibilityLabel={`Country code ${selectedCountry.dialCode}`}>
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Phone number input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handlePhoneChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={Brand.textOnDarkMuted}
          keyboardType="phone-pad"
          returnKeyType="done"
          maxLength={15}
          editable={editable}
          selectionColor={Brand.primary}
          cursorColor={Brand.primary}
        />
      </Animated.View>

      {/* Error message */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Country Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable onPress={() => { setShowPicker(false); setSearch(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code..."
              placeholderTextColor={Brand.textOnDarkMuted}
              autoFocus
              selectionColor={Brand.primary}
            />

            {/* Country list */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.countryItem,
                    pressed && styles.countryItemPressed,
                    item.code === selectedCountry.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleSelectCountry(item)}>
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryDial}>{item.dialCode}</Text>
                  {item.code === selectedCountry.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surfaceCard,
    borderWidth: 1.5,
    borderColor: Brand.surfaceCardBorder,
    borderRadius: Radius.md,
    overflow: 'hidden',
    minHeight: 56,
  },
  errorBorder: {
    borderColor: Brand.error,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    minWidth: 90,
  },
  flag: {
    fontSize: 22,
  },
  dialCode: {
    color: Brand.textOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: {
    color: Brand.textOnDarkSecondary,
    fontSize: 11,
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Brand.surfaceCardBorder,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: Brand.textOnDark,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  errorText: {
    color: Brand.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: Spacing.one,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Brand.surfaceDarkLight,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '75%',
    paddingBottom: Platform.select({ ios: 34, default: 16 }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  modalTitle: {
    color: Brand.textOnDark,
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    color: Brand.textOnDarkSecondary,
    fontSize: 18,
    padding: Spacing.one,
  },
  searchInput: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    backgroundColor: Brand.surfaceCard,
    borderWidth: 1,
    borderColor: Brand.surfaceCardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    color: Brand.textOnDark,
    fontSize: 15,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 13,
    gap: Spacing.two,
  },
  countryItemPressed: {
    backgroundColor: Brand.surfaceCard,
  },
  countryItemSelected: {
    backgroundColor: Brand.primaryGlow,
  },
  countryFlag: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  countryName: {
    flex: 1,
    color: Brand.textOnDark,
    fontSize: 15,
    fontWeight: '500',
  },
  countryDial: {
    color: Brand.textOnDarkSecondary,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  checkmark: {
    color: Brand.primary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: Spacing.two,
  },
});
