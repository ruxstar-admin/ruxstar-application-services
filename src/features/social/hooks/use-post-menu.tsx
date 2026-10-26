import { useState } from 'react';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ReportSheet } from '@/features/moderation/components/ReportSheet';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { SocialService } from '@/services/social-service';
import type { Post } from '@/types/social';

/**
 * The "…" menu for a post and everything it can lead to: edit, delete (confirmed), report, block.
 * Returns `openMenu` for the card and `sheets` to render once on the screen.
 */
export function usePostMenu({ onRemoved }: { onRemoved: (post: Post) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const markFeedDirty = useFeedStore((s) => s.markDirty);

  const [target, setTarget] = useState<Post | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const openMenu = (post: Post) => {
    setTarget(post);
    setMenuOpen(true);
  };

  const chooseFromMenu = (next: () => void) => {
    setMenuOpen(false);
    next();
  };

  const confirmDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await SocialService.deletePost(token, target.id);
      Feedback.success();
      onRemoved(target);
      markFeedDirty();
      setDeleting(false);
    } catch {
      Feedback.error();
    } finally {
      setBusy(false);
    }
  };

  const blockAuthor = async () => {
    if (!target) return;
    await ProfileService.block(token, { userId: target.author.id, name: target.author.name, username: target.author.username });
    onRemoved(target);
  };

  const sheets = (
    <>
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        {target?.mine ? (
          <>
            <ListRow
              icon="create-outline"
              title="Edit post"
              onPress={() =>
                chooseFromMenu(() => router.push({ pathname: '/(customer)/create-post', params: { id: target.id, text: target.text } }))
              }
            />
            <ListRow icon="trash-outline" title="Delete post" destructive onPress={() => chooseFromMenu(() => setDeleting(true))} />
          </>
        ) : (
          <ListRow icon="flag-outline" title="Report post" onPress={() => chooseFromMenu(() => setReporting(true))} />
        )}
      </BottomSheet>

      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        title="Report post"
        subject={target?.author.name ?? ''}
        onReport={(reason) => (target ? SocialService.reportPost(token, target.id, reason) : Promise.resolve())}
        onBlock={blockAuthor}
      />

      <ConfirmSheet
        visible={deleting}
        title="Delete this post?"
        message="It will be removed for everyone. This cannot be undone."
        confirmLabel="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  );

  return { openMenu, sheets };
}
