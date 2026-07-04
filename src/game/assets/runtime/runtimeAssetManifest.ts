const runtimeAssetPaths: Record<string, string> = {
  full_board_main: "/assets/riftfall/board/full-board/ashen_reach_board_main.png"
};

export function getRuntimeAssetPath(assetId: string): string {
  return runtimeAssetPaths[assetId] ?? "/assets/riftfall/ui/placeholder_missing_asset.png";
}
