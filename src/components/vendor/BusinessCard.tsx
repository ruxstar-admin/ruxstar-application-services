/**
 * BusinessCard — shows a single vendor business.
 * Cover (tap camera badge to change photo) · type/category · status chip
 * Action button (Setup / Calendar) · remove
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Radius, Spacing } from '@/constants/theme';
import { supportsSetup, isServiceType, uploadBusinessThumbnail, type Business } from '@/services/vendor-business-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ActionType = 'calendar' | 'setup' | 'add-event' | 'manage-registrations'
               | 'appointments-board' | 'coming-soon' | 'print-orders'
               | 'commerce-orders' | 'offers';

function getAction(b: Business, eventCount = 0): ActionType {
  // Events module — "Manage registrations" when events exist, else "Add Event"
  if (b.module === 'events') return eventCount > 0 ? 'manage-registrations' : 'add-event';
  if (b.setupComplete || b.status === 'live') {
    // Print shops → view print orders
    if (b.module === 'print') return 'print-orders';
    // Commerce shops → view orders
    if (b.module === 'commerce') return 'commerce-orders';
    // Creator businesses → manage offers
    if (b.module === 'creator') return 'offers';
    // Service businesses (salon/clinic/coaching) → appointments board
    if (isServiceType(b.typeId)) return 'appointments-board';
    // All other live businesses (turf, venue, sports) → slot calendar
    return 'calendar';
  }
  if (!supportsSetup(b)) return 'coming-soon';
  return 'setup';
}

function statusChip(b: Business, brand: BrandTokens): { label: string; color: string; bg: string; dot: string } {
  // Events businesses + service businesses (salon/clinic) have no slot wizard — live as soon as they exist
  if (b.module === 'events' || isServiceType(b.typeId) || b.setupComplete || b.status === 'live') {
    return { label: 'Live', color: brand.success, bg: 'rgba(22,163,74,0.08)', dot: brand.success };
  }
  if (supportsSetup(b)) {
    return { label: 'Needs setup', color: brand.warning, bg: 'rgba(217,119,6,0.08)', dot: brand.warning };
  }
  return { label: 'Coming soon', color: brand.creamMuted, bg: brand.surface2, dot: brand.creamMuted };
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    backgroundColor: brand.surface1,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     brand.border1,
    overflow:        'hidden',
  },

  coverWrap:     { height: 130, position: 'relative' },
  cover:         { width: '100%', height: '100%' },
  coverFallback: { width: '100%', height: '100%', backgroundColor: brand.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  coverInitial:  { fontSize: 48, fontWeight: '800', color: brand.primary, opacity: 0.6 },

  statusChip: {
    position: 'absolute', top: Spacing.two, left: Spacing.two,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two, paddingVertical: 3,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cameraBadge: {
    position: 'absolute', bottom: Spacing.two, right: Spacing.two,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  body:    { padding: Spacing.three, gap: 5 },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  bodyLeft:{ flex: 1 },

  name: { fontSize: 15, fontWeight: '700', color: brand.cream },
  meta: { fontSize: 12, color: brand.creamSub, marginTop: 2 },

  removeBtn:         { width: 30, height: 30, borderRadius: Radius.md, backgroundColor: 'rgba(220,38,38,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' },
  removeBtnDisabled: { opacity: 0.5 },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: 12, color: brand.creamMuted, flex: 1 },

  footer: { borderTopWidth: 1, borderTopColor: brand.border1, paddingHorizontal: Spacing.three, paddingTop: 10, paddingBottom: 10, gap: 10 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.three, paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.30)',
    backgroundColor: 'rgba(217,119,6,0.06)',
    alignSelf: 'flex-start',
  },
  actionBtnCalendar: { borderColor: 'rgba(124,58,237,0.25)', backgroundColor: brand.primaryGlow },
  actionBtnEvent:    { borderColor: 'rgba(124,58,237,0.25)', backgroundColor: brand.primaryGlow },
  actionBtnMuted:    { borderColor: brand.border1, backgroundColor: brand.surface1 },
  actionBtnText:     { fontSize: 12, fontWeight: '700', color: brand.warning },
  actionBtnTextCalendar: { color: brand.primary },
  actionBtnTextMuted:    { color: brand.creamMuted },
});

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  business: Business;
  onRemove: (id: string) => Promise<void>;
  removing: boolean;
  onThumbnailUpdated?: (updated: Business) => void;
  eventCount?: number;
  firstEventId?: string;
};

export default function BusinessCard({ business, onRemove, removing, onThumbnailUpdated, eventCount = 0, firstEventId }: Props) {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [imgError,        setImgError]        = useState(false);
  const [thumbUri,        setThumbUri]         = useState<string | undefined>(business.thumbnailUrl);
  const [uploadingThumb,  setUploadingThumb]   = useState(false);


  const chip    = statusChip(business, brand);
  const action  = getAction(business, eventCount);
  const initial = (business.name || '?').charAt(0).toUpperCase();

  // ─── Thumbnail upload ───────────────────────────────────────────────────────

  async function handleChangeCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo access to change the cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mime  = asset.mimeType ?? 'image/jpeg';
    const base64 = `data:${mime};base64,${asset.base64}`;

    if (!token) return;
    try {
      setUploadingThumb(true);
      const updated = await uploadBusinessThumbnail(token, business.id, base64);
      setThumbUri(updated.thumbnailUrl);
      setImgError(false);
      onThumbnailUpdated?.(updated);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update cover photo.');
    } finally {
      setUploadingThumb(false);
    }
  }

  // ─── Remove ─────────────────────────────────────────────────────────────────

  function confirmRemove() {
    Alert.alert(
      'Remove Business',
      `Remove "${business.name}" from your listings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(business.id) },
      ],
    );
  }

  // ─── Action ─────────────────────────────────────────────────────────────────

  function handleAction() {
    if (action === 'print-orders') {
      router.push('/(vendor)/print-orders' as never);
    } else if (action === 'setup') {
      router.push({ pathname: '/(vendor)/business-setup', params: { id: business.id } } as never);
    } else if (action === 'calendar') {
      router.push({ pathname: '/(vendor)/slot-calendar', params: { id: business.id, name: business.name } } as never);
    } else if (action === 'appointments-board') {
      router.push({
        pathname: '/(vendor)/appointments-board',
        params: { businessId: business.id, businessName: business.name },
      } as never);
    } else if (action === 'commerce-orders') {
      router.push({
        pathname: '/(vendor)/commerce-orders',
        params: { businessId: business.id },
      } as never);
    } else if (action === 'offers') {
      router.push('/(vendor)/offers' as never);
    } else if (action === 'add-event') {
      router.push({
        pathname: '/(vendor)/create-event',
        params: {
          businessId:   business.id,
          businessName: business.name,
          typeId:       business.typeId,
          typeLabel:    business.typeLabel,
        },
      } as never);
    } else if (action === 'manage-registrations') {
      if (!firstEventId) return;
      router.push({
        pathname: '/(vendor)/event-registrations',
        params: { eventId: firstEventId, businessName: business.name },
      } as never);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={s.card}>
      {/* Cover */}
      <View style={s.coverWrap}>
        {thumbUri && !imgError ? (
          <Image
            source={{ uri: thumbUri }}
            style={s.cover}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.coverFallback}>
            <Text style={s.coverInitial}>{initial}</Text>
          </View>
        )}

        {/* Status chip */}
        <View style={[s.statusChip, { backgroundColor: chip.bg }]}>
          <View style={[s.statusDot, { backgroundColor: chip.dot }]} />
          <Text style={[s.statusText, { color: chip.color }]}>{chip.label}</Text>
        </View>

        {/* Camera badge — tap to change cover photo */}
        <Pressable
          style={s.cameraBadge}
          onPress={handleChangeCover}
          disabled={uploadingThumb}
          hitSlop={6}
        >
          {uploadingThumb
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="camera-outline" size={13} color="#fff" />}
        </Pressable>
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.bodyRow}>
          <View style={s.bodyLeft}>
            <Text style={s.name} numberOfLines={1}>{business.name}</Text>
            <Text style={s.meta} numberOfLines={1}>
              {business.typeLabel}
              {business.categoryLabel ? ` · ${business.categoryLabel}` : ''}
            </Text>
          </View>

          <Pressable
            style={[s.removeBtn, removing && s.removeBtnDisabled]}
            onPress={confirmRemove}
            disabled={removing}
            hitSlop={6}
          >
            {removing
              ? <ActivityIndicator size="small" color={brand.error} />
              : <Ionicons name="trash-outline" size={15} color={brand.error} />}
          </Pressable>
        </View>

        {business.address ? (
          <View style={s.infoRow}>
            <Ionicons name="location-outline" size={11} color={brand.creamMuted} />
            <Text style={s.infoText} numberOfLines={1}>{business.address}</Text>
          </View>
        ) : null}

        {business.phone ? (
          <View style={s.infoRow}>
            <Ionicons name="call-outline" size={11} color={brand.creamMuted} />
            <Text style={s.infoText} numberOfLines={1}>{business.phone}</Text>
          </View>
        ) : null}
      </View>

      {/* Action footer */}
      <View style={s.footer}>
        <Pressable
          style={[
            s.actionBtn,
            (action === 'calendar' || action === 'appointments-board' || action === 'print-orders' ||
              action === 'commerce-orders' || action === 'offers') && s.actionBtnCalendar,
            (action === 'add-event' || action === 'manage-registrations') && s.actionBtnEvent,
            action === 'coming-soon' && s.actionBtnMuted,
          ]}
          onPress={handleAction}
          disabled={action === 'coming-soon'}
        >
          <Ionicons
            name={
              action === 'calendar'             ? 'calendar-outline'  :
              action === 'appointments-board'   ? 'people-outline'    :
              action === 'print-orders'         ? 'print-outline'     :
              action === 'commerce-orders'      ? 'cart-outline'      :
              action === 'offers'               ? 'megaphone-outline' :
              action === 'setup'                ? 'construct-outline' :
              action === 'add-event'            ? 'ticket-outline'    :
              action === 'manage-registrations' ? 'list-outline'      :
                                                  'time-outline'
            }
            size={14}
            color={
              action === 'calendar' || action === 'appointments-board' || action === 'print-orders' ||
              action === 'commerce-orders' || action === 'offers'                                    ? brand.primary :
              action === 'add-event' || action === 'manage-registrations'                           ? brand.primary :
              action === 'setup'                                                                    ? brand.warning :
                                                                                                     brand.creamMuted
            }
          />
          <Text style={[
            s.actionBtnText,
            (action === 'calendar' || action === 'appointments-board' || action === 'print-orders' ||
              action === 'commerce-orders' || action === 'offers') && s.actionBtnTextCalendar,
            (action === 'add-event' || action === 'manage-registrations') && s.actionBtnTextCalendar,
            action === 'coming-soon' && s.actionBtnTextMuted,
          ]}>
            {action === 'calendar'             ? 'View Calendar'        :
             action === 'appointments-board'   ? 'View Appointments'    :
             action === 'print-orders'         ? 'Print Orders'         :
             action === 'commerce-orders'      ? 'View Orders'          :
             action === 'offers'               ? 'Manage Offers'        :
             action === 'setup'                ? 'Finish Setup'         :
             action === 'add-event'            ? 'Add Event'            :
             action === 'manage-registrations' ? 'Manage Registrations' :
                                                 'Setup Coming Soon'}
          </Text>
          {action !== 'coming-soon' && (
            <Ionicons
              name="chevron-forward"
              size={13}
              color={
                action === 'calendar' || action === 'appointments-board' || action === 'print-orders' ||
                action === 'commerce-orders' || action === 'offers' ||
                action === 'add-event' || action === 'manage-registrations'
                  ? brand.primary
                  : brand.warning
              }
            />
          )}
        </Pressable>

      </View>
    </View>
  );
}
