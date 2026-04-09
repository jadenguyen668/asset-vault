import type { Character } from '@/types/database';

export function generateAutoTags(char: Partial<Character>): string[] {
  const tags: string[] = [];
  if (char.asset_type === '2d') { tags.push('2d-art'); return tags; }
  if (char.asset_type === '3d') { tags.push('3d-model'); return tags; }
  if (char.major_version === 3) tags.push('spine-3.x');
  if (char.major_version === 4) tags.push('spine-4.x');
  const ac = char.anim_count || 0;
  if (ac <= 5) tags.push('few-anims');
  else if (ac <= 15) tags.push('medium-anims');
  else tags.push('many-anims');
  const bc = char.bone_count || 0;
  if (bc <= 30) tags.push('simple-rig');
  else if (bc <= 100) tags.push('medium-rig');
  else tags.push('complex-rig');
  if ((char.skin_count || 0) > 1) tags.push('multi-skin');
  const fs = char.file_size || 0;
  if (fs < 500_000) tags.push('lightweight');
  else if (fs > 5_000_000) tags.push('heavy');
  return tags;
}
