import { imagePrompts } from "./imagePrompts.js";

export interface AssetManifestEntry {
  id: string;
  fileName: string;
  outputPath: string;
  assetType: string;
  usage: string;
}

export const assetManifest: AssetManifestEntry[] = imagePrompts.map((prompt) => ({
  id: prompt.id,
  fileName: prompt.fileName,
  outputPath: prompt.outputPath,
  assetType: prompt.assetType,
  usage: prompt.usage
}));

export function getAssetPath(assetId: string): string {
  const asset = assetManifest.find((item) => item.id === assetId);
  return asset?.outputPath ?? "/assets/riftfall/ui/placeholder_missing_asset.png";
}
