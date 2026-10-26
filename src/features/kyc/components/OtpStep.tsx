import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { Brand, Spacing, Typography } from '@/constants/theme';

interface OtpStepProps {
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}

/** Six-digit code entry for the Aadhaar check, with the shared OTP cells (shake on error). */
export function OtpStep({ value, onChange, hasError }: OtpStepProps) {
  return (
    <View>
      <OtpInput value={value} onChangeText={onChange} autoFocus hasError={hasError} />
      {hasError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={Brand.error} />
          <Text style={styles.errorText}>Check the code and try again.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.two },
  errorText: { ...Typography.caption, color: Brand.error },
});
