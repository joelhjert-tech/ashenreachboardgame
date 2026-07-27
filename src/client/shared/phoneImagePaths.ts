const RASTER_EXTENSION = /\.(?:png|jpe?g|webp)$/i;

export function isPhoneOptimizableRasterPath(path: string): boolean {
  return RASTER_EXTENSION.test(path) && !path.endsWith(".phone.webp");
}

export function getPhoneOptimizedImagePath(path: string): string {
  if (!isPhoneOptimizableRasterPath(path)) {
    return path;
  }

  return path.replace(RASTER_EXTENSION, ".phone.webp");
}
