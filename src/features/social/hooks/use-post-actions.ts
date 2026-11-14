import { useCallback } from 'react';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';
import type { Post } from '@/types/social';

/**
 * Optimistic like / save: the UI flips immediately, takes the server's like count when it answers, and rolls back if the
 * request fails. Changes go to the feed store, so every list showing the post (see `useLatestPosts`) agrees; `patch`
 * also updates a post a screen holds by itself.
 */
export function usePostActions(patch?: (id: string, changes: Partial<Post>) => void) {
  const token = useAuthToken();
  const editPost = useFeedStore((s) => s.editPost);
  const apply = useCallback(
    (id: string, changes: Partial<Post>) => {
      editPost(id, changes);
      patch?.(id, changes);
    },
    [editPost, patch],
  );

  const toggleLike = useCallback(
    async (post: Post) => {
      const liked = !post.likedByMe;
      apply(post.id, { likedByMe: liked, likes: Math.max(0, post.likes + (liked ? 1 : -1)) });
      try {
        const state = await SocialService.like(token, post.id, liked);
        apply(post.id, { likedByMe: state.likedByMe, likes: state.likes });
      } catch {
        Feedback.error();
        apply(post.id, { likedByMe: post.likedByMe, likes: post.likes });
      }
    },
    [apply, token],
  );

  const toggleSave = useCallback(
    async (post: Post) => {
      const saved = !post.savedByMe;
      apply(post.id, { savedByMe: saved });
      try {
        await SocialService.save(token, post.id, saved);
      } catch {
        Feedback.error();
        apply(post.id, { savedByMe: post.savedByMe });
      }
    },
    [apply, token],
  );

  return { toggleLike, toggleSave };
}
