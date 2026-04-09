interface SignedUrlResponse { url: string; token: string; }

export async function uploadFile(characterId: number, filename: string, blob: Blob): Promise<string> {
  const res = await fetch('/api/storage/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId, filename }) });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { url, token } = (await res.json()) as SignedUrlResponse;
  const uploadRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob });
  if (!uploadRes.ok) throw new Error('Upload failed');
  return `${characterId}/${filename}`;
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
  const res = await fetch('/api/storage/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
  if (!res.ok) throw new Error('Failed to get download URL');
  return ((await res.json()) as { url: string }).url;
}

export async function downloadFile(path: string): Promise<Blob> {
  const url = await getDownloadUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}

export async function downloadSpineFiles(jsonPath: string, atlasPath: string, pngPaths: string[]) {
  const [jsonBlob, atlasBlob] = await Promise.all([downloadFile(jsonPath), downloadFile(atlasPath)]);
  const pngBlobs = await Promise.all(pngPaths.map(async (p) => ({ name: p.split('/').pop()!, blob: await downloadFile(p) })));
  return { jsonBlob, atlasBlob, pngBlobs };
}

export async function deleteCharacterFiles(characterId: number): Promise<void> {
  const res = await fetch('/api/storage/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId }) });
  if (!res.ok) throw new Error('Delete failed');
}
