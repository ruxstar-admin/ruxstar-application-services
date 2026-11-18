import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Notice, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { FreelanceService } from '@/services/gigs-service';
import type { GigPhoto, GigsRules, MyFreelancer, PortfolioLink } from '@/types/gigs';
import { PhotoGrid } from '../components/PhotoGrid';
import { ProfileFields } from '../components/ProfileFields';
import { useGigLimits, useGigsRules, useMyFreelancer } from '../hooks/use-gigs';
import { linkErrors, profileChanges, profileDraftOf, profileErrors, type ProfileDraft } from '../lib/forms';

const PHOTO_SIDE = 1440;

type Dropping = { kind: 'photo'; item: GigPhoto } | { kind: 'link'; item: PortfolioLink } | null;

function Portfolio({ me, setMe }: { me: MyFreelancer; setMe: (m: MyFreelancer) => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState<'photo' | 'link' | 'drop' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [dropping, setDropping] = useState<Dropping>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [shown, setShown] = useState(false);
  const max = useGigLimits().portfolio;
  const used = me.portfolio.photos.length + me.portfolio.links.length;
  const room = used < max;
  const errors = linkErrors(title, url);

  const run = async (name: 'photo' | 'link' | 'drop', action: () => Promise<MyFreelancer>) => {
    setBusy(name);
    setFailure(null);
    try {
      setMe(await action());
      Feedback.success();
      return true;
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (asset) void run('photo', async () => FreelanceService.addPortfolioPhoto(token, await toUploadJpeg(asset, PHOTO_SIDE)));
  };

  const addLink = async () => {
    setShown(true);
    if (Object.keys(errors).length) return;
    if (await run('link', () => FreelanceService.addLink(token, { title: title.trim(), url: url.trim() }))) {
      setAdding(false);
      setTitle('');
      setUrl('');
      setShown(false);
    }
  };

  const drop = async () => {
    const d = dropping;
    setDropping(null);
    if (d?.kind === 'photo') await run('drop', () => FreelanceService.removePortfolioPhoto(token, d.item.id));
    if (d?.kind === 'link') await run('drop', () => FreelanceService.removeLink(token, d.item.id));
  };

  return (
    <>
      <Section title={`Portfolio (${used} of ${max})`} />
      <Text style={styles.small}>Photos of your best work and links to it, like a Behance page or a website you built.</Text>
      <PhotoGrid photos={me.portfolio.photos} name={me.name} room={room} busy={busy === 'photo'} onAdd={() => void addPhoto()} onRemove={(item) => setDropping({ kind: 'photo', item })} />
      {me.portfolio.links.map((l) => (
        <View key={l.id} style={styles.link}>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(l.url)} style={styles.flex}>
            <Text style={styles.strong} numberOfLines={1}>
              {l.title}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {l.url}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${l.title}`} hitSlop={10} onPress={() => setDropping({ kind: 'link', item: l })}>
            <Ionicons name="close" size={20} color={Brand.textMuted} />
          </Pressable>
        </View>
      ))}
      {adding ? (
        <Card>
          <InputField label="Title" value={title} onChangeText={setTitle} maxLength={80} placeholder="Like “Brand work for a café”" error={shown ? errors.title : undefined} />
          <InputField
            label="Link"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://"
            error={shown ? errors.url : undefined}
          />
          <PrimaryButton label="Add link" loading={busy === 'link'} onPress={addLink} />
          <TextLink muted label="Cancel" onPress={() => setAdding(false)} />
        </Card>
      ) : room ? (
        <TextLink label="Add a link" onPress={() => setAdding(true)} />
      ) : null}
      {failure ? <ErrorBanner message={failure} /> : null}
      <ConfirmSheet
        visible={!!dropping}
        title={dropping?.kind === 'link' ? 'Remove this link?' : 'Remove this photo?'}
        message="Customers won’t see it on your page any more."
        confirmLabel="Remove"
        loading={busy === 'drop'}
        onConfirm={() => void drop()}
        onCancel={() => setDropping(null)}
      />
    </>
  );
}

function ProfileForm({ me, setMe, rules }: { me: MyFreelancer; setMe: (m: MyFreelancer) => void; rules: GigsRules }) {
  const token = useAuthToken();
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftOf(me));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const errors = profileErrors(draft);
  const changes = profileChanges(draft, me);
  const changed = Object.keys(changes).length > 0;
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const next = await FreelanceService.update(token, changes);
      setMe(next);
      setDraft(profileDraftOf(next));
      setSaved(true);
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Profile and portfolio" footer={<PrimaryButton label={saved && !changed ? 'Saved' : 'Save profile'} loading={busy} disabled={!changed} onPress={save} />}>
      {me.avatarUrl ? null : <Notice text="Your photo comes from your Ruxstar profile. Add one there so customers see who they’re working with." />}
      <ProfileFields draft={draft} set={set} errors={shown ? errors : {}} categories={rules.categories} />
      {failure ? <ErrorBanner message={failure} /> : null}
      <Portfolio me={me} setMe={setMe} />
    </ScreenContainer>
  );
}

/** Editing your freelancer profile, and your portfolio's photos and links. */
export function FreelanceProfileScreen() {
  const rules = useGigsRules();
  const me = useMyFreelancer();
  if (rules.data && me.data) return <ProfileForm me={me.data} setMe={me.setData} rules={rules.data} />;
  return (
    <ScreenContainer title="Profile and portfolio">
      <AsyncBoundary
        loading={rules.loading || me.loading}
        error={rules.error ?? me.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          me.reload();
        }}
        skeletonRows={5}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  link: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
});
