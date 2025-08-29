export function getPublicAssetUrl(file: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/public-assets/${file}`;
}
