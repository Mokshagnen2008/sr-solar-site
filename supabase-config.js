export const SUPABASE_URL = "https://bqgbpxruysashzzouept.supabase.co";
export const SUPABASE_PUBLIC_KEY = "sb_publishable_4zbGoRCyq10EDFvAABdmAg_Wnm4-_Iy";
export const ADMIN_EMAIL = "smoksha1989@gmail.com";
export const PROJECT_PHOTOS_BUCKET = "project-photos";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function hasSupabaseConfig() {
    return SUPABASE_URL.startsWith("https://")
        && !SUPABASE_URL.includes("YOUR_PROJECT_ID")
        && SUPABASE_PUBLIC_KEY.length > 20
        && !SUPABASE_PUBLIC_KEY.includes("YOUR_SUPABASE_");
}
