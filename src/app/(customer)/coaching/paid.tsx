import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';

/**
 * Where the coaching checkout sends the parent back to. On Android the link opens on top of the enrolment, so it steps
 * back to it; with nothing behind it, it opens the enrolment from the link.
 */
export default function CoachingPaidScreen() {
  const router = useRouter();
  const { order } = useLocalSearchParams<{ order?: string }>();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else if (order) router.replace({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: order } });
    else router.replace('/(customer)/coaching/classes');
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
