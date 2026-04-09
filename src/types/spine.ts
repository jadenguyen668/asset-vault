export interface SpineFiles {
  jsonText: string;
  atlasText: string;
  pngBlobs: Map<string, Blob>;
  jsonName: string;
}

export interface GridSpineData {
  assetType?: 'spine' | '2d' | '3d';
  mimeType?: string;
  fileBlob?: Blob;
  jsonText: string;
  atlasText: string;
  pngBlobs: Map<string, Blob>;
  jsonName: string;
  majorVersion: number;
  minorVersion: number;
}

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  runtime: string;
}
