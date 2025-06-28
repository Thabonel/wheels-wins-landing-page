export function getPublicAssetUrl(file: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/public-assets/${file}`;
}
