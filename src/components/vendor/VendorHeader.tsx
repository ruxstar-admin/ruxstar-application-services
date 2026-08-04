/**
 * VendorHeader — shared header for all vendor tab screens.
 *
 * • Hamburger (≡) on the left opens a left-side sliding drawer
 * • "Ruxstar" brand in the center
 * • Notification bell + avatar on the right
 *
 * Drawer (slides in from LEFT) contains:
 *   – Profile card (name, phone, vendor badge)
 *   – Navigate: Orders, Print Orders
 *   – Navigate: Ruxstar Card, Profile & Settings, Notifications
 *   – Sign out
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { NotificationBell } from '@/components/NotificationBell';

const SCREEN_WIDTH  = Dimensions.get('window').width;
const DRAWER_WIDTH  = Math.min(SCREEN_WIDTH * 0.78, 320);

const ROUTE_TITLES: Record<string, string> = {
  '/(vendor)':                    'Dashboard',
  '/(vendor)/index':              'Dashboard',
  '/(vendor)/businesses':         'Businesses',
  '/(vendor)/payments':           'Payments',
  '/(vendor)/profile':            'Profile',
  '/(vendor)/orders':             'Orders',
  '/(vendor)/stores':             'Store Hours',
  '/(vendor)/card':               'Ruxstar Card',
  '/(vendor)/notifications':      'Notifications',
  '/(vendor)/print-orders':       'Print Orders',
  '/(vendor)/print-order-detail': 'Print Order',
  '/(vendor)/products':           'Products',
  '/(vendor)/commerce-orders':   'Commerce Orders',
  '/(vendor)/offers':            'Offers',
  '/(vendor)/creator-bookings':  'Creator Bookings',
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ') || 'Ruxstar';
}

// ─── Left Drawer ──────────────────────────────────────────────────────────────

function LeftDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { name, phone, clearAuth, setActiveMode } = useAuthStore();
  const { mode: themeMode, toggle: toggleTheme } = useThemeStore();
  const { brand } = useTheme();
  const initial = (name ?? 'V').charAt(0).toUpperCase();

  const open = useCallback(() => {
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 24,
      stiffness: 220,
    }).start();
  }, [slideX]);

  const close = useCallback(() => {
    Animated.timing(slideX, {
      toValue: -DRAWER_WIDTH,
      useNativeDriver: true,
      duration: 200,
    }).start(onClose);
  }, [slideX, onClose]);

  useEffect(() => {
    if (visible) open();
  }, [visible, open]);

  if (!visible) return null;

  function navigate(href: string) {
    close();
    setTimeout(() => router.push(href as never), 220);
  }

  function signOut() {
    close();
    setTimeout(() => {
      setActiveMode(null);
      clearAuth();
      router.replace('/(auth)/welcome');
    }, 220);
  }

  function switchToUserMode() {
    setActiveMode('user');
    close();
    setTimeout(() => router.replace('/(user)' as never), 220);
  }

  const NAV_SECTIONS = [
    {
      label: 'Manage',
      items: [
        { icon: 'storefront-outline' as const, label: 'Store Availability', href: '/(vendor)/stores'          },
        { icon: 'receipt-outline'    as const, label: 'Orders',             href: '/(vendor)/orders'          },
        { icon: 'bag-outline'        as const, label: 'Commerce Orders',    href: '/(vendor)/commerce-orders' },
        { icon: 'cube-outline'       as const, label: 'Products',           href: '/(vendor)/products'        },
        { icon: 'print-outline'      as const, label: 'Print Orders',       href: '/(vendor)/print-orders'    },
        { icon: 'megaphone-outline'  as const, label: 'Offers',             href: '/(vendor)/offers'          },
        { icon: 'star-outline'       as const, label: 'Creator Bookings',   href: '/(vendor)/creator-bookings'},
      ],
    },
    {
      label: 'Account',
      items: [
        { icon: 'id-card-outline'       as const, label: 'Ruxstar Card',       href: '/(vendor)/card'          },
        { icon: 'person-outline'        as const, label: 'Profile & Settings', href: '/(vendor)/profile'       },
        { icon: 'notifications-outline' as const, label: 'Notifications',      href: '/(vendor)/notifications' },
      ],
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Backdrop — tapping closes */}
      <TouchableWithoutFeedback onPress={close}>
        <View style={dr.backdrop} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          dr.panel,
          {
            paddingTop:      insets.top    + Spacing.three,
            paddingBottom:   insets.bottom + Spacing.four,
            transform:       [{ translateX: slideX }],
            backgroundColor: brand.bg,
            borderRightColor: brand.border1,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={dr.scroll}
        >
          {/* Profile card */}
          <View style={dr.profileCard}>
            <View style={dr.avatar}>
              <Text style={dr.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[dr.name, { color: brand.cream }]} numberOfLines={1}>{name ?? 'Vendor'}</Text>
              <Text style={[dr.phone, { color: brand.creamSub }]} numberOfLines={1}>{phone ?? ''}</Text>
            </View>
            <View style={[dr.badge, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
              <View style={dr.badgeDot} />
              <Text style={[dr.badgeText, { color: brand.creamSub }]}>Vendor</Text>
            </View>
          </View>

          <View style={[dr.divider, { backgroundColor: brand.border1 }]} />

          {/* Nav sections */}
          {NAV_SECTIONS.map((section) => (
            <View key={section.label} style={dr.section}>
              <Text style={[dr.sectionLabel, { color: brand.creamMuted }]}>{section.label}</Text>
              {section.items.map((item) => (
                <Pressable
                  key={item.href}
                  style={({ pressed }) => [dr.menuRow, pressed && { backgroundColor: brand.surface1 }]}
                  onPress={() => navigate(item.href)}
                >
                  <View style={[dr.menuIcon, { backgroundColor: brand.surface2 }]}>
                    <Ionicons name={item.icon} size={18} color={brand.creamSub} />
                  </View>
                  <Text style={[dr.menuLabel, { color: brand.cream }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={brand.creamMuted} />
                </Pressable>
              ))}
            </View>
          ))}

          <View style={[dr.divider, { backgroundColor: brand.border1 }]} />

          {/* Switch to Customer View */}
          <Pressable
            style={({ pressed }) => [dr.switchBtn, pressed && { opacity: 0.75 }]}
            onPress={switchToUserMode}
          >
            <Ionicons name="swap-horizontal-outline" size={17} color="#7C3AED" />
            <Text style={dr.switchBtnText}>Switch to Customer View</Text>
          </Pressable>

          <View style={[dr.divider, { backgroundColor: brand.border1 }]} />

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [dr.signOutBtn, pressed && { opacity: 0.75 }]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={17} color="#DC2626" />
            <Text style={dr.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── VendorHeader ─────────────────────────────────────────────────────────────

export default function VendorHeader() {
  const { name, token } = useAuthStore();
  const { brand } = useTheme();
  const { mode: themeMode, toggle: toggleTheme } = useThemeStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initial = (name ?? 'V').charAt(0).toUpperCase();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <View style={[h.bar, { backgroundColor: brand.bg, borderBottomColor: brand.border1 }]}>
        {/* Profile icon — tapping opens the left drawer */}
        <Pressable
          style={h.avatar}
          onPress={() => setDrawerOpen(true)}
          hitSlop={8}
          accessibilityLabel="Open menu"
        >
          <Ionicons name="person-circle" size={34} color="#fff" />
        </Pressable>

        {/* Page title */}
        <Text style={[h.brand, { color: brand.cream }]}>{pageTitle}</Text>

        {/* Theme toggle + Bell on the right */}
        <View style={h.right}>
          <Pressable onPress={toggleTheme} hitSlop={8} style={h.themeBtn}>
            <Ionicons
              name={themeMode === 'dark' ? 'sunny' : 'moon'}
              size={20}
              color={brand.cream}
            />
          </Pressable>
          {token && (
            <NotificationBell token={token} pageHref="/(vendor)/notifications" />
          )}
        </View>
      </View>

      <LeftDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const h = StyleSheet.create({
  bar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom:     Spacing.two + 2,
    backgroundColor:   Brand.bg,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  brand: {
    fontSize:      20,
    fontWeight:    '800',
    color:         Brand.cream,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
  },
  avatar: {
    alignItems:  'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  themeBtn: { padding: 4 },
});

const dr = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },

  panel: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    left:            0,
    width:           DRAWER_WIDTH,
    backgroundColor: Brand.bg,
    borderRightWidth: 1,
    borderRightColor: Brand.border1,
  },

  scroll: {
    paddingHorizontal: Spacing.four,
    gap:               Spacing.three,
    paddingBottom:     Spacing.two,
  },

  // Profile card
  profileCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.two,
    paddingVertical: Spacing.two,
  },
  avatar: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: Brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name:       { color: Brand.cream,    fontSize: 15, fontWeight: '700' },
  phone:      { color: Brand.creamSub, fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.two,
    paddingVertical:   4,
    borderRadius:      Radius.pill,
    backgroundColor:   Brand.surface1,
    borderWidth:       1,
    borderColor:       Brand.border1,
    flexShrink:        0,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.success },
  badgeText: { color: Brand.creamSub, fontSize: 10, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Brand.border1 },

  // Sections
  section:      { gap: Spacing.one },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700',
    color:         Brand.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom:  Spacing.one,
  },

  // Menu rows
  menuRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.two,
    paddingVertical: 11,
    borderRadius:    Radius.lg,
    paddingHorizontal: Spacing.two,
  },
  menuRowPressed: { backgroundColor: Brand.surface1 },
  menuIcon: {
    width:           36,
    height:          36,
    borderRadius:    Radius.md,
    backgroundColor: Brand.surface2,
    alignItems:      'center',
    justifyContent:  'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Brand.cream },

  // Switch to customer view
  switchBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 13,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     'rgba(124,58,237,0.25)',
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  switchBtnText: { color: '#7C3AED', fontSize: 14, fontWeight: '700' },

  // Sign out
  signOutBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 13,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     'rgba(220,38,38,0.20)',
    backgroundColor: 'rgba(220,38,38,0.04)',
  },
  signOutText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
});
