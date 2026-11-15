import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';

/**
 * Where the turf checkout sends the player back to. On Android the link opens on top of the booking, so it steps back to
 * it; with nothing behind it, it opens the booking from the link.
 */
export default function TurfPaidScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order?: string }>();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else if (order) router.replace({ pathname: '/(customer)/turf/booking/[id]', params: { id: order } });
    else router.replace('/(customer)/turf/bookings');
  }, [router, order]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Brand.primarySoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.bg },
});
