import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface PhotoStepProps {
  uri?: string;
  hint: string;
  camera: 'front' | 'back';
  onPicked: (uri: string) => void;
}

/** Capture a document or selfie with the camera, or pick one from the gallery. Handles a denied camera permission. */
export function PhotoStep({ uri, hint, camera, onPicked }: PhotoStepProps) {
  const [denied, setDenied] = useState(false);

  const take = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setDenied(true);
      return;
    }
    setDenied(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: camera === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      quality: 0.7,
    });
    if (!result.canceled) {
      Feedback.select();
      onPicked(result.assets[0].uri);
    }
  };

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      Feedback.select();
      onPicked(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.frame, camera === 'front' && styles.frameRound]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Captured photo" />
        ) : (
          <Ionicons name={camera === 'front' ? 'person-outline' : 'document-text-outline'} size={44} color={Brand.textFaint} />
        )}
      </View>
      <Text style={styles.hint}>{hint}</Text>
      {denied ? (
        <View style={styles.denied}>
          <Text style={styles.deniedText}>Camera access is off. Allow it in Settings, or choose a photo from your gallery.</Text>
          <TextLink label="Open Settings" onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
      <PrimaryButton label={uri ? 'Retake photo' : 'Take photo'} variant={uri ? 'outline' : 'primary'} onPress={take} />
      <TextLink muted label="Choose from gallery" onPress={choose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, alignItems: 'stretch' },
  frame: {
    height: 220,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameRound: { alignSelf: 'center', width: 220, borderRadius: Radius.pill },
  hint: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  denied: { gap: Spacing.one, alignItems: 'center' },
  deniedText: { ...Typography.caption, color: Brand.error, textAlign: 'center' },
});
