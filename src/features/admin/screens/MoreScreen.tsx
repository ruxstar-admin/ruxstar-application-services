import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { createLogger } from '@/lib/logger';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { allows, useAccess, type Need } from '../access';
import { ConsoleScreen, consoleStyles } from '../components/parts';
import { IconTile, TileCard, cellWidth, tileCardInner, type Icon, type Tint } from '../components/tiles';

const log = createLogger('console');

/** A tile shows when the person has any of `needs`, the same check its screen makes. */
interface Item {
  label: string;
  icon: Icon;
  href: Href;
  needs: Need[];
}

const SECTIONS: { title: string; icon: Icon; tint: Tint; items: Item[] }[] = [
  {
    title: 'People & safety',
    icon: 'people-outline',
    tint: 'blue',
    items: [
      { label: 'People', icon: 'people-outline', href: '/(admin)/(tabs)/people', needs: ['users.view'] },
      { label: 'Staff', icon: 'shield-outline', href: '/(admin)/staff', needs: ['admin'] },
      { label: 'Verification', icon: 'shield-checkmark-outline', href: '/(admin)/(tabs)/kyc', needs: ['kyc.view'] },
      { label: 'Reports', icon: 'flag-outline', href: '/(admin)/(tabs)/reports', needs: ['reports.view', 'orders.view'] },
      { label: 'Help tickets', icon: 'help-buoy-outline', href: '/(admin)/support', needs: ['support.view'] },
    ],
  },
  {
    title: 'Businesses',
    icon: 'storefront-outline',
    tint: 'purple',
    items: [
      { label: 'Businesses', icon: 'storefront-outline', href: '/(admin)/businesses', needs: ['businesses.view'] },
      { label: 'Events', icon: 'ticket-outline', href: '/(admin)/events', needs: ['businesses.view'] },
      { label: 'Courses', icon: 'school-outline', href: '/(admin)/coaching', needs: ['businesses.view'] },
      { label: 'Grounds', icon: 'football-outline', href: '/(admin)/grounds', needs: ['businesses.view'] },
      { label: 'Sports list', icon: 'list-outline', href: '/(admin)/sports', needs: ['businesses.view'] },
      { label: 'PGs & hostels', icon: 'bed-outline', href: '/(admin)/properties', needs: ['businesses.view'] },
      { label: 'Facilities', icon: 'list-outline', href: '/(admin)/facilities', needs: ['businesses.view'] },
      { label: 'Objections', icon: 'shield-outline', href: '/(admin)/objections', needs: ['orders.view'] },
      { label: 'Local shops', icon: 'storefront-outline', href: '/(admin)/stores', needs: ['businesses.view'] },
      { label: 'Shop products', icon: 'pricetags-outline', href: '/(admin)/store-products', needs: ['businesses.view'] },
      { label: 'Shop orders', icon: 'bag-handle-outline', href: '/(admin)/store-orders', needs: ['orders.view'] },
      { label: 'Freelancers', icon: 'color-palette-outline', href: '/(admin)/freelancers', needs: ['businesses.view'] },
      { label: 'Gigs', icon: 'briefcase-outline', href: '/(admin)/gig-listings', needs: ['businesses.view'] },
      { label: 'Freelance orders', icon: 'file-tray-full-outline', href: '/(admin)/gig-orders', needs: ['orders.view'] },
      { label: 'Banned categories', icon: 'ban-outline', href: '/(admin)/banned', needs: ['businesses.view'] },
    ],
  },
  {
    title: 'Money',
    icon: 'wallet-outline',
    tint: 'green',
    items: [
      { label: 'Payouts', icon: 'wallet-outline', href: '/(admin)/payouts', needs: ['payouts.view'] },
      { label: 'Invoices', icon: 'document-text-outline', href: '/(admin)/invoices', needs: ['orders.view'] },
      { label: 'GST', icon: 'calculator-outline', href: '/(admin)/gst', needs: ['modules.view'] },
      { label: 'Coupons', icon: 'pricetag-outline', href: '/(admin)/coupons', needs: ['coupons.view'] },
    ],
  },
  {
    title: 'Settings',
    icon: 'settings-outline',
    tint: 'amber',
    items: [
      { label: 'Modules', icon: 'apps-outline', href: '/(admin)/modules', needs: ['modules.view'] },
      { label: 'Audit log', icon: 'time-outline', href: '/(admin)/audit', needs: ['audit.view'] },
    ],
  },
  {
    title: 'Your account',
    icon: 'person-circle-outline',
    tint: 'purple',
    items: [
      { label: 'Password', icon: 'key-outline', href: '/(admin)/password', needs: [null] },
      { label: 'Sessions', icon: 'phone-portrait-outline', href: '/(admin)/sessions', needs: [null] },
    ],
  },
];

const COLUMNS = 4;

export function MoreScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const access = useAccess();
  const { width } = useWindowDimensions();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const name = useAuthStore((s) => s.name);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const tileWidth = cellWidth(tileCardInner(width, true), COLUMNS);

  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((item) => item.needs.some((need) => allows(access, need))) })).filter((s) => s.items.length > 0);

  const logOut = async () => {
    setLoggingOut(true);
    // The server session is ended best-effort; the local session always ends.
    await AuthService.logout(token, refreshToken).catch(() => log.warn('server logout failed'));
    clearAuth();
  };

  return (
    <ConsoleScreen title="More" subtitle={[name, access.admin ? 'Admin' : access.title].filter(Boolean).join(' · ')}>
      <ScrollView contentContainerStyle={consoleStyles.list} showsVerticalScrollIndicator={false}>
        {sections.map((s) => (
          <TileCard key={s.title} title={s.title} icon={s.icon} tint={s.tint} flat>
            {s.items.map((item) => (
              <IconTile key={item.label} icon={item.icon} label={item.label} tint={s.tint} width={tileWidth} onPress={() => router.push(item.href)} />
            ))}
          </TileCard>
        ))}
        <View style={styles.logOut}>
          <ListRow icon="log-out-outline" title="Log out" destructive onPress={() => setConfirming(true)} />
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title="Log out?"
        message="You will need your password or a one-time code to log back in."
        confirmLabel="Log out"
        loading={loggingOut}
        onConfirm={logOut}
        onCancel={() => setConfirming(false)}
      />
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  logOut: { paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
});
