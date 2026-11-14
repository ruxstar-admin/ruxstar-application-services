import { Fragment, useMemo } from 'react';
import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';
import { richText } from '@/features/social/lib/rich-text';

/**
 * Post, comment or chat text with @mentions opening that person's profile and web links opening in the browser.
 * `linkStyle` suits links to the background, such as your own chat bubble.
 */
export function PostText({ text, style, linkStyle }: { text: string; style?: StyleProp<TextStyle>; linkStyle?: StyleProp<TextStyle> }) {
  const router = useRouter();
  const parts = useMemo(() => richText(text), [text]);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.kind === 'text' ? (
          <Fragment key={i}>{part.text}</Fragment>
        ) : (
          <Text
            key={i}
            accessibilityRole="link"
            style={[styles.link, linkStyle]}
            onPress={() =>
              part.kind === 'mention'
                ? router.push({ pathname: '/(customer)/user/[id]', params: { id: part.username } })
                : Linking.openURL(part.url).catch(() => undefined)
            }
          >
            {part.text}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: Brand.primarySoft },
});
