/**
 * Vendor Dashboard
 * Greeting · KYC status · revenue metrics + 7-day chart · quick CTAs
 * Mirrors web /business page: 4 metric cards + revenue bar chart + booking status pills
 *
 * Loading strategy: kycLoading guard prevents "Complete KYC" flash before API responds.
 * kycStore initialises loading:true so the skeleton shows until the first fetch resolves.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AnimatedRN, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path, Defs, LinearGradient, Stop, Circle, G,
  Text as SvgText,
} from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { listVendorBookings, istDayKey, type VendorBooking } from '@/services/booking-service';
import KycStatusCard from '@/components/vendor/KycStatusCard';
import VendorHeader from '@/components/vendor/VendorHeader';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bookingAmount(b: VendorBooking): number {
  return b.amount ?? b.pricePerSlot ?? 0;
}

/** Last 7 calendar days as IST day-keys, oldest first */
function last7DayKeys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(istDayKey(d.toISOString()));
  }
  return keys;
}

const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dayIndex(iso: string): number {
  const d = new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' });
  const order: Record<string, number> = { Mon:0, Tue:1, Wed:2, Thu:3, Fri:4, Sat:5, Sun:6 };
  return order[d] ?? 0;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLine({ width = '80%', height = 14 }: { width?: string | number; height?: number }) {
  const { brand } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        height,
        width: width as number,
        backgroundColor: brand.surface2,
        borderRadius: 7,
        opacity,
      }}
    />
  );
}

const createSkStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: brand.surface2,
  },
  chevron: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: brand.surface2,
  },
});

function DashboardSkeleton() {
  const { brand } = useTheme();
  const sk = useMemo(() => createSkStyles(brand), [brand]);
  return (
    <View style={{ gap: Spacing.three }}>
      {/* KYC card placeholder */}
      <View style={sk.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={sk.icon} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLine width="45%" height={13} />
            <SkeletonLine width="72%" height={10} />
          </View>
        </View>
      </View>
      {/* CTA placeholder */}
      <View style={sk.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={sk.icon} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLine width="55%" height={13} />
            <SkeletonLine width="80%" height={10} />
          </View>
          <View style={sk.chevron} />
        </View>
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const createMetricStyles = (brand: BrandTokens) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '48%',
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    gap: 4,
    flexGrow: 1,
  },
  cardAccent: {
    borderColor: 'rgba(124,58,237,0.30)',
    backgroundColor: brand.primaryGlow,
  },
  skel: {
    height: 22,
    width: '60%',
    backgroundColor: brand.surface2,
    borderRadius: 5,
  },
  value: {
    fontSize: 21,
    fontWeight: '800',
    color: brand.cream,
    letterSpacing: -0.6,
  },
  valueAccent: {
    color: brand.primary,
  },
  label: {
    fontSize: 11,
    color: brand.creamMuted,
    fontWeight: '500',
  },
});

function MetricCard({
  label, value, loading, accent,
}: {
  label:   string;
  value:   string;
  loading: boolean;
  accent?: boolean;
}) {
  const { brand } = useTheme();
  const m = useMemo(() => createMetricStyles(brand), [brand]);
  return (
    <View style={[m.card, accent && m.cardAccent]}>
      {loading ? (
        <View style={m.skel} />
      ) : (
        <Text style={[m.value, accent && m.valueAccent]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
      <Text style={m.label}>{label}</Text>
    </View>
  );
}

const createChartStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  wrap: {
    gap: Spacing.one + 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.creamSub,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: 12,
    color: brand.creamMuted,
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: brand.creamMuted,
  },
});

function RevenueArea({
  days, values,
}: {
  days:   string[];
  values: number[];
}) {
  const { brand } = useTheme();
  const ch = useMemo(() => createChartStyles(brand), [brand]);

  const maxVal  = Math.max(...values, 1);
  const hasData = values.some((v) => v > 0);

  const pts = values.map((v, i) => ({
    x: (i / 6) * 100,
    y: 38 - Math.max(2, (v / maxVal) * 34),
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L 100,40 L 0,40 Z`;

  return (
    <View style={ch.wrap}>
      <Text style={ch.title}>Revenue — last 7 days</Text>
      {!hasData ? (
        <Text style={ch.empty}>No revenue in last 7 days</Text>
      ) : (
        <Svg width="100%" height={76} viewBox="0 0 100 40" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor={brand.primary} stopOpacity="0.32" />
              <Stop offset="1"   stopColor={brand.primary} stopOpacity="0"    />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#revGrad)" />
          <Path
            d={linePath}
            fill="none"
            stroke={brand.primary}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) =>
            values[i] > 0 ? (
              <Circle key={i} cx={p.x} cy={p.y} r="2" fill={brand.primary} />
            ) : null,
          )}
        </Svg>
      )}
      <View style={ch.dayRow}>
        {days.map((dk) => (
          <Text key={dk} style={ch.dayLabel}>
            {DAY_ABBR[dayIndex(dk + 'T12:00:00')] ?? '·'}
          </Text>
        ))}
      </View>
    </View>
  );
}

const createDonutStyles = (brand: BrandTokens) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  skel: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.surface2,
  },
  legend: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    color: brand.creamSub,
    fontSize: 13,
  },
  legendValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});

function BookingDonut({
  completed, upcoming, cancelled, loading,
}: {
  completed: number;
  upcoming:  number;
  cancelled: number;
  loading:   boolean;
}) {
  const { brand } = useTheme();
  const dn = useMemo(() => createDonutStyles(brand), [brand]);

  const total = completed + upcoming + cancelled;
  const R     = 15.915;
  const SW    = 7;

  const segs = [
    { label: 'Completed', value: completed, color: brand.success },
    { label: 'Upcoming',  value: upcoming,  color: brand.primary },
    { label: 'Cancelled', value: cancelled, color: brand.error   },
  ];

  let acc = 0;
  const arcs = segs.map((seg) => {
    const pct    = total > 0 ? (seg.value / total) * 100 : 0;
    const offset = acc;
    acc += pct;
    return { ...seg, pct, offset: -offset };
  });

  return (
    <View style={dn.row}>
      <View>
        {loading ? (
          <View style={dn.skel} />
        ) : (
          <Svg width={80} height={80} viewBox="0 0 40 40">
            <G rotation="-90" origin="20,20">
              <Circle
                cx="20" cy="20" r={R}
                fill="none"
                stroke={brand.surface2}
                strokeWidth={SW}
              />
              {total > 0 && arcs.map((arc) => (
                <Circle
                  key={arc.label}
                  cx="20" cy="20" r={R}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={SW}
                  strokeDasharray={`${arc.pct} ${100 - arc.pct}`}
                  strokeDashoffset={arc.offset}
                />
              ))}
            </G>
            <SvgText
              x="20" y="20"
              textAnchor="middle"
              dy="0.35em"
              fontSize={total >= 100 ? 6 : 8}
              fontWeight="800"
              fill={brand.cream}
            >
              {total}
            </SvgText>
          </Svg>
        )}
      </View>

      <View style={dn.legend}>
        {segs.map((seg) => (
          <View key={seg.label} style={dn.legendRow}>
            <View style={[dn.dot, { backgroundColor: seg.color }]} />
            <Text style={dn.legendLabel}>{seg.label}</Text>
            <Text style={[dn.legendValue, { color: seg.color }]}>
              {loading ? '–' : seg.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createMainStyles = (brand: BrandTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
  },
  brand:       { color: brand.cream, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logoutBtn:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: brand.border2,
  },
  logoutText: { color: brand.creamSub, fontSize: 13, fontWeight: '600' },

  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },

  greetBlock: { gap: 2 },
  greeting:   { color: brand.creamSub, fontSize: 14 },
  userName:   { color: brand.cream, fontSize: 26, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  tagline:    { color: brand.creamMuted, fontSize: 13, marginTop: 2 },

  ctaGroup: { gap: Spacing.two },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  ctaMuted:      { opacity: 0.6 },
  ctaPressed:    { opacity: 0.75 },
  ctaIcon: {
    width: 40, height: 40,
    borderRadius: Radius.md,
    backgroundColor: brand.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaIconMuted:  { backgroundColor: brand.surface2 },
  ctaText:       { flex: 1, gap: 2 },
  ctaLabel:      { color: brand.cream, fontSize: 15, fontWeight: '700' },
  ctaLabelMuted: { color: brand.creamSub },
  ctaSub:        { color: brand.creamMuted, fontSize: 12 },

  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: brand.primaryGlow,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    padding: Spacing.two + 4,
  },
  tipText: { color: brand.creamSub, fontSize: 12, flex: 1, lineHeight: 18 },
});

function CtaRow({
  icon, label, sub, onPress, muted, brand, s,
}: {
  icon:    keyof typeof Ionicons.glyphMap;
  label:   string;
  sub:     string;
  onPress: () => void;
  muted?:  boolean;
  brand:   BrandTokens;
  s:       ReturnType<typeof createMainStyles>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.ctaBtn, muted && s.ctaMuted, pressed && s.ctaPressed]}
      onPress={onPress}
    >
      <View style={[s.ctaIcon, muted && s.ctaIconMuted]}>
        <Ionicons name={icon} size={20} color={muted ? brand.creamMuted : brand.primary} />
      </View>
      <View style={s.ctaText}>
        <Text style={[s.ctaLabel, muted && s.ctaLabelMuted]}>{label}</Text>
        <Text style={s.ctaSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={brand.creamMuted} />
    </Pressable>
  );
}

const createChartCardStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: brand.creamSub,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const { name, token } = useAuthStore();
  const kycStatus      = useKycStore((s) => s.status);
  const kycLoading     = useKycStore((s) => s.loading);
  const { businesses, loading: bizLoading, loadBusinesses } = useBusinessStore();

  const { brand } = useTheme();
  const s  = useMemo(() => createMainStyles(brand), [brand]);
  const ch = useMemo(() => createChartCardStyles(brand), [brand]);

  const [bookings,        setBookings]        = useState<VendorBooking[]>([]);
  const [metricsLoading,  setMetricsLoading]  = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);

  // Show skeleton while KYC status hasn't loaded yet — prevents verified vendors
  // from briefly seeing "Complete KYC" before the API responds.
  const kycPending  = kycLoading || kycStatus === null;
  const kycVerified = !kycPending && kycStatus?.status === 'verified';

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    await Promise.allSettled([
      loadBusinesses(token),
      (async () => {
        try {
          setMetricsLoading(true);
          const bks = await listVendorBookings(token);
          setBookings(bks);
        } catch {
          // Ignore — metrics show zeros on error
        } finally {
          setMetricsLoading(false);
        }
      })(),
    ]);
    if (isRefresh) setRefreshing(false);
  }, [token, loadBusinesses]);

  useEffect(() => { load(); }, [load]);

  // ── Metrics ───────────────────────────────────────────────────────────────

  const now = Date.now();
  const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);

  const nonCancelled = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled'),
    [bookings],
  );

  const totalRevenue = useMemo(
    () => nonCancelled.reduce((sum, b) => sum + bookingAmount(b), 0),
    [nonCancelled],
  );

  const thisMonthRevenue = useMemo(
    () => nonCancelled
      .filter((b) => istDayKey(b.startAt).startsWith(thisMonth))
      .reduce((sum, b) => sum + bookingAmount(b), 0),
    [nonCancelled, thisMonth],
  );

  const upcomingCount = useMemo(
    () => nonCancelled.filter((b) => new Date(b.startAt).getTime() > now).length,
    [nonCancelled, now],
  );

  const avgValue = useMemo(
    () => nonCancelled.length > 0 ? Math.round(totalRevenue / nonCancelled.length) : 0,
    [totalRevenue, nonCancelled],
  );

  const completedCount = useMemo(
    () => nonCancelled.filter((b) => new Date(b.startAt).getTime() <= now).length,
    [nonCancelled, now],
  );

  const cancelledCount = useMemo(
    () => bookings.filter((b) => b.status === 'cancelled').length,
    [bookings],
  );

  const dayKeys = useMemo(() => last7DayKeys(), []);
  const dayValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dk of dayKeys) map[dk] = 0;
    for (const b of nonCancelled) {
      const dk = istDayKey(b.startAt);
      if (dk in map) map[dk] += bookingAmount(b);
    }
    return dayKeys.map((dk) => map[dk]);
  }, [dayKeys, nonCancelled]);

  // ── Greeting ──────────────────────────────────────────────────────────────

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={brand.primary}
          />
        }
      >
        {/* ── Greeting ──────────────────────────────────────────────── */}
        <AnimatedRN.View entering={FadeInDown.delay(0)} style={s.greetBlock}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.userName}>{name ?? 'Vendor'}</Text>
          <Text style={s.tagline}>
            {kycVerified
              ? `${businesses.length} business${businesses.length !== 1 ? 'es' : ''} · ${upcomingCount} upcoming`
              : 'Manage your business on Ruxstar'}
          </Text>
        </AnimatedRN.View>

        {/* ── KYC / CTA section — skeleton until status loads ────────── */}
        {kycPending ? (
          <AnimatedRN.View entering={FadeInDown.delay(80)}>
            <DashboardSkeleton />
          </AnimatedRN.View>
        ) : (
          <>
            {/* KYC Status card */}
            {kycStatus ? (
              <KycStatusCard
                status={kycStatus.status}
                rejectReason={kycStatus.message}
                delay={80}
              />
            ) : null}

            {/* ── KYC Verified: metrics ──────────────────────────── */}
            {kycVerified && (
              <>
                <AnimatedRN.View entering={FadeInDown.delay(120)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                  <MetricCard
                    label="Total Revenue"
                    value={fmt(totalRevenue)}
                    loading={metricsLoading}
                    accent
                  />
                  <MetricCard
                    label="This Month"
                    value={fmt(thisMonthRevenue)}
                    loading={metricsLoading}
                  />
                  <MetricCard
                    label="Upcoming"
                    value={String(upcomingCount)}
                    loading={metricsLoading}
                  />
                  <MetricCard
                    label="Avg Booking"
                    value={fmt(avgValue)}
                    loading={metricsLoading}
                  />
                </AnimatedRN.View>

                <AnimatedRN.View entering={FadeInDown.delay(180)} style={ch.card}>
                  <RevenueArea days={dayKeys} values={dayValues} />
                </AnimatedRN.View>

                <AnimatedRN.View entering={FadeInDown.delay(220)} style={ch.card}>
                  <Text style={ch.title}>Booking Overview</Text>
                  <BookingDonut
                    completed={completedCount}
                    upcoming={upcomingCount}
                    cancelled={cancelledCount}
                    loading={metricsLoading}
                  />
                </AnimatedRN.View>

                <AnimatedRN.View entering={FadeInDown.delay(260)} style={s.ctaGroup}>
                  <CtaRow
                    icon="storefront-outline"
                    label="My Businesses"
                    sub="Add or manage your listings"
                    onPress={() => router.push('/(vendor)/businesses' as never)}
                    brand={brand}
                    s={s}
                  />
                  <CtaRow
                    icon="receipt-outline"
                    label="Orders"
                    sub="View and manage incoming bookings"
                    onPress={() => router.push('/(vendor)/orders' as never)}
                    brand={brand}
                    s={s}
                  />
                  <CtaRow
                    icon="wallet-outline"
                    label="Payments"
                    sub="Track your earnings"
                    onPress={() => router.push('/(vendor)/payments' as never)}
                    brand={brand}
                    s={s}
                  />
                  <CtaRow
                    icon="id-card-outline"
                    label="Ruxstar Card"
                    sub="Your verified vendor identity"
                    onPress={() => router.push('/(vendor)/card' as never)}
                    muted
                    brand={brand}
                    s={s}
                  />
                </AnimatedRN.View>
              </>
            )}

            {/* ── Not verified: complete KYC CTA ────────────────── */}
            {!kycVerified && (
              <AnimatedRN.View entering={FadeInDown.delay(160)} style={s.ctaGroup}>
                <CtaRow
                  icon="shield-checkmark-outline"
                  label="Complete KYC"
                  sub="Verify your identity to unlock all features"
                  onPress={() => router.push('/(vendor)/kyc' as never)}
                  brand={brand}
                  s={s}
                />
              </AnimatedRN.View>
            )}
          </>
        )}

        {/* ── Tip ───────────────────────────────────────────────────── */}
        <AnimatedRN.View entering={FadeInDown.delay(320)} style={s.tip}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={brand.primary}
            style={{ marginTop: 1 }}
          />
          <Text style={s.tipText}>
            {kycVerified
              ? 'Pull down to refresh your stats. Tap "Orders" to manage bookings.'
              : 'Complete KYC to start listing your business and accepting bookings.'}
          </Text>
        </AnimatedRN.View>
      </ScrollView>
    </SafeAreaView>
  );
}
