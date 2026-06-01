const SPINE_SKELETON_EXTENSION_REGEX = /\.(spine-json|json|skel)$/i;

export const SPINE_IMPORT_ACCEPT = '.json,.spine-json,.skel,.atlas,.atlas.txt,.png';

export function isSpineSkeletonFilename(filename: string): boolean {
  const normalized = filename.toLowerCase();
  return normalized.endsWith('.spine-json') || normalized.endsWith('.json') || normalized.endsWith('.skel');
}

export function stripSpineSkeletonExtension(filename: string): string {
  return filename.replace(SPINE_SKELETON_EXTENSION_REGEX, '');
}

export function toSpineAtlasFilename(filename: string): string {
  return filename.replace(SPINE_SKELETON_EXTENSION_REGEX, '.atlas');
}
