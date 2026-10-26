import { useCallback } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';
import type { Post } from '@/types/social';

/**
 * Optimistic like / save: the UI flips immediately and rolls back if the request fails.
 * `patch` applies a partial update to whichever list (or single post) is on screen.
 */
export function usePostActions(patch: (id: string, changes: Partial<Post>) => void) {
  const token = useAuthToken();

  const toggleLike = useCallback(
    async (post: Post) => {
      const liked = !post.likedByMe;
      patch(post.id, { likedByMe: liked, likes: post.likes + (liked ? 1 : -1) });
      try {
        await SocialService.like(token, post.id, liked);
      } catch {
        Feedback.error();
        patch(post.id, { likedByMe: post.likedByMe, likes: post.likes });
      }
    },
    [patch, token],
  );

  const toggleSave = useCallback(
    async (post: Post) => {
      const saved = !post.savedByMe;
      patch(post.id, { savedByMe: saved });
      try {
        await SocialService.save(token, post.id, saved);
      } catch {
        Feedback.error();
        patch(post.id, { savedByMe: post.savedByMe });
      }
    },
    [patch, token],
  );

  return { toggleLike, toggleSave };
}
