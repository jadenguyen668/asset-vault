interface SignedUrlResponse { url: string; token: string; }

function normalizeStoragePath(path: string): string {
  return path.split('/').filter(Boolean).join('/');
}

function buildLegacyFallbackPath(path: string, userId?: string): string | null {
  if (!userId) return null;
  const normalized = normalizeStoragePath(path);
  if (!normalized || normalized.startsWith(`${userId}/`)) return null;
  return `${userId}/${normalized}`;
}

export async function uploadFile(characterId: number, filename: string, blob: Blob): Promise<string> {
  const res = await fetch('/api/storage/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId, filename }) });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { url, token } = (await res.json()) as SignedUrlResponse;
  const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
  if (!uploadRes.ok) throw new Error('Upload failed');
  const payload = (await uploadRes.json().catch(() => null)) as { key?: string } | null;
  return payload?.key || `${characterId}/${filename}`;
}

export async function uploadSpineFiles(characterId: number, jsonBlob: Blob, atlasBlob: Blob, pngBlobs: { name: string; blob: Blob }[], jsonName: string) {
  const jsonPath = await uploadFile(characterId, jsonName, jsonBlob);
  const atlasName = jsonName.replace(/\.(json|skel)$/i, '.atlas');
  const atlasPath = await uploadFile(characterId, atlasName, atlasBlob);
  const pngPaths: string[] = [];
  for (const png of pngBlobs) { pngPaths.push(await uploadFile(characterId, png.name, png.blob)); }
  return { jsonPath, atlasPath, pngPaths };
}

export async function getDownloadUrl(path: string): Promise<string> {
  const res = await fetch('/api/storage/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: normalizeStoragePath(path) }) });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to get download URL for "${normalizeStoragePath(path)}" (${res.status}${detail ? `: ${detail}` : ''})`);
  }
  return ((await res.json()) as { url: string }).url;
}

export async function downloadFile(path: string, userId?: string): Promise<Blob> {
  const normalizedPath = normalizeStoragePath(path);
  const attemptedPaths = [normalizedPath];
  const legacyFallbackPath = buildLegacyFallbackPath(normalizedPath, userId);
  if (legacyFallbackPath) attemptedPaths.push(legacyFallbackPath);

  let lastError: Error | null = null;
  for (const candidatePath of attemptedPaths) {
    try {
      const url = await getDownloadUrl(candidatePath);
      const res = await fetch(url);
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Download failed for "${candidatePath}" (${res.status}${detail ? `: ${detail}` : ''})`);
      }
      return await res.blob();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`Download failed for "${normalizedPath}"`);
}

export async function downloadSpineFiles(jsonPath: string, atlasPath: string, pngPaths: string[], userId?: string) {
  const [jsonBlob, atlasBlob] = await Promise.all([downloadFile(jsonPath, userId), downloadFile(atlasPath, userId)]);
  const pngBlobs = await Promise.all(pngPaths.map(async (p) => ({ name: p.split('/').pop()!, blob: await downloadFile(p, userId) })));
  return { jsonBlob, atlasBlob, pngBlobs };
}

export async function deleteCharacterFiles(characterId: number): Promise<void> {
  const res = await fetch('/api/storage/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId }) });
  if (!res.ok) throw new Error('Delete failed');
}
