import { Switch } from 'react-native';
import { Brand } from '@/constants/theme';
import { ListRow } from '@/components/ui/ListRow';
import { Feedback } from '@/lib/haptics';

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** A `ListRow` with a switch; the whole row toggles. */
export function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps) {
  const toggle = (next: boolean) => {
    Feedback.select();
    onValueChange(next);
  };

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      onPress={() => toggle(!value)}
      right={
        <Switch
          value={value}
          onValueChange={toggle}
          trackColor={{ false: Brand.disabled, true: Brand.primaryDeep }}
          thumbColor={Brand.text}
          accessibilityLabel={title}
        />
      }
    />
  );
}
