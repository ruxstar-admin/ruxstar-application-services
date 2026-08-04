/**
 * DropdownPicker — themed select button + bottom-sheet option list.
 *
 * Trigger shows:
 *   [icon]  Selected label          [chevron]
 *
 * When a non-default option is active the border turns primary-coloured.
 * Tapping opens a modal bottom sheet; the active row has a checkmark.
 */

import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';

export interface DropdownOption {
  label: string;
  value: string;
  icon?: string;
}

interface Props {
  options:       DropdownOption[];
  value:         string;
  onChange:      (value: string) => void;
  placeholder?:  string;
  flex?:         number;
  label?:        string;   // sheet heading
  defaultValue?: string;   // value considered "no filter" — trigger stays neutral
}

export default function DropdownPicker({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  flex = 1,
  label,
  defaultValue,
}: Props) {
  const { brand } = useTheme();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selected = options.find((o) => o.value === value);
  const display  = selected?.label ?? placeholder;

  // Highlight the trigger when user has picked something other than the default
  const isFiltered =
    defaultValue !== undefined
      ? value !== defaultValue
      : value !== options[0]?.value;

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          dd.trigger,
          {
            flex,
            backgroundColor: brand.surface1,
            borderColor: isFiltered ? brand.primary : brand.border2,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${display}`}
      >
        {/* Left: icon + label */}
        <View style={dd.triggerLeft}>
          {selected?.icon ? (
            <Ionicons
              name={selected.icon as never}
              size={15}
              color={isFiltered ? brand.primary : brand.creamMuted}
            />
          ) : (
            <Ionicons
              name="funnel-outline"
              size={15}
              color={isFiltered ? brand.primary : brand.creamMuted}
            />
          )}
          <Text
            style={[
              dd.triggerLabel,
              { color: isFiltered ? brand.primary : brand.cream },
              isFiltered && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {display}
          </Text>
          {isFiltered && (
            <View style={[dd.dot, { backgroundColor: brand.primary }]} />
          )}
        </View>

        {/* Divider */}
        <View style={[dd.divider, { backgroundColor: isFiltered ? `${brand.primary}40` : brand.border2 }]} />

        {/* Right: chevron */}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={isFiltered ? brand.primary : brand.creamMuted}
          style={dd.chevron}
        />
      </Pressable>

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={dd.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              dd.sheet,
              {
                backgroundColor: brand.bg,
                borderColor: brand.border2,
                paddingBottom: insets.bottom + 12,
              },
            ]}
            onPress={() => {}}
          >
            {/* Handle */}
            <View style={[dd.handle, { backgroundColor: brand.border2 }]} />

            {/* Sheet heading */}
            {label ? (
              <Text style={[dd.sheetHeading, { color: brand.creamMuted }]}>{label}</Text>
            ) : null}

            {/* Options */}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      dd.item,
                      { borderBottomColor: brand.border1 },
                      active  && { backgroundColor: brand.primaryGlow },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => pick(item.value)}
                  >
                    {/* Option icon */}
                    {item.icon ? (
                      <View style={[dd.itemIconWrap, { backgroundColor: active ? `${brand.primary}18` : brand.surface2 }]}>
                        <Ionicons
                          name={item.icon as never}
                          size={18}
                          color={active ? brand.primary : brand.creamMuted}
                        />
                      </View>
                    ) : null}

                    {/* Option label */}
                    <Text
                      style={[
                        dd.itemText,
                        { color: active ? brand.cream : brand.creamSub },
                        active && dd.itemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    {/* Checkmark */}
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={brand.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const dd = StyleSheet.create({
  // Trigger button
  trigger: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    borderWidth:    1.5,
    height:         46,
    overflow:       'hidden',
  },
  triggerLeft: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    paddingHorizontal: Spacing.three,
  },
  triggerLabel: {
    flex:       1,
    fontSize:   14,
    fontWeight: '600',
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  divider: {
    width:  1,
    height: '60%',
  },
  chevron: {
    paddingHorizontal: Spacing.two + 2,
  },

  // Backdrop + sheet
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth:       1,
    maxHeight:            '70%',
    paddingTop:           Spacing.two,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: Spacing.three,
  },
  sheetHeading: {
    fontSize:        11,
    fontWeight:      '700',
    letterSpacing:   0.9,
    textTransform:   'uppercase',
    paddingHorizontal: Spacing.four,
    paddingBottom:   Spacing.two,
  },

  // Option rows
  item: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two + 2,
    paddingHorizontal: Spacing.four,
    paddingVertical:   14,
    borderBottomWidth: 1,
  },
  itemIconWrap: {
    width:          38,
    height:         38,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  itemText: {
    flex:       1,
    fontSize:   15,
    fontWeight: '500',
  },
  itemTextActive: {
    fontWeight: '700',
  },
});
