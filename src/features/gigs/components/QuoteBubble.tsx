import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import type { QuoteCard } from '@/types/gigs';
import { daysText, quoteBadge, quoteNote, quoteStatus, revisionsText } from '../lib/gigs';

export type QuoteAction = 'pay' | 'withdraw' | 'order';

const WIDTH = 260;

function Action({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && styles.pressed]}
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

/** A custom offer in a chat: what's included, price, days and revisions, its state, and Pay or Withdraw while it's open. */
export function QuoteBubble({ quote, now, onAction }: { quote: QuoteCard; now: number; onAction: (action: QuoteAction) => void }) {
  const status = quoteStatus(quote, now);
  const open = status === 'open';
  return (
    <View style={styles.card} accessibilityLabel={`Offer from ${quote.freelancer.name}: ${quote.title}, ${money(quote.price)}`}>
      <View style={styles.head}>
        <Ionicons name="briefcase-outline" size={16} color={Brand.primarySoft} />
        <Text style={styles.overline}>Custom offer</Text>
        <View style={styles.badge}>
          <Badge {...quoteBadge(quote, now)} />
        </View>
      </View>
      <Text style={styles.title}>{quote.title}</Text>
      <Text style={styles.description} numberOfLines={6}>
        {quote.description}
      </Text>
      <Text style={styles.price}>{money(quote.price)}</Text>
      <Text style={styles.meta}>{`${daysText(quote.deliveryDays)} delivery · ${revisionsText(quote.revisions)}`}</Text>
      <Text style={styles.meta}>{quoteNote(quote, now)}</Text>
      {open && quote.canPay ? <Action label="Pay for this offer" primary onPress={() => onAction('pay')} /> : null}
      {open && quote.canWithdraw ? <Action label="Withdraw offer" onPress={() => onAction('withdraw')} /> : null}
      {status === 'paid' && quote.orderId ? <Action label="Open the order" onPress={() => onAction('order')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: WIDTH, gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: 'rgba(0,0,0,0.2)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  overline: { ...Typography.overline, color: Brand.textMuted },
  badge: { marginLeft: 'auto' },
  title: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.one },
  description: { ...Typography.caption, color: Brand.text },
  price: { ...Typography.heading, fontSize: 20, color: Brand.text, marginTop: Spacing.one },
  meta: { ...Typography.caption, color: Brand.textMuted },
  action: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  actionPrimary: { backgroundColor: Brand.action, borderColor: Brand.action },
  actionText: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  actionTextPrimary: { color: Brand.onAction },
  pressed: { opacity: 0.8 },
});
