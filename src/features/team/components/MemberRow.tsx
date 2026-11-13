import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import type { PermissionInfo, TeamMember } from '@/types/team';
import { MEMBER_STATUS, inviteEnds, permissionsLine } from '../lib/team';

/** One person on a team, or invited to it. */
export function MemberRow({ member, catalog, onPress }: { member: TeamMember; catalog: PermissionInfo[]; onPress?: () => void }) {
  const status = MEMBER_STATUS[member.status];
  const who = member.person.username ? `@${member.person.username}` : null;
  const detail = member.status === 'invited' && member.expiresAt ? inviteEnds(member.expiresAt) : permissionsLine(catalog, member.permissions);
  return (
    <ListRow
      leading={<Avatar name={member.person.name} uri={member.person.avatar ?? undefined} size={40} />}
      title={member.person.name}
      subtitle={[who, detail].filter(Boolean).join(' · ')}
      right={<Badge label={status.label} tone={status.tone} />}
      onPress={onPress}
    />
  );
}
