import {
    hasSupabaseConfig,
    PROJECT_PHOTOS_BUCKET,
    SUPABASE_PUBLIC_KEY,
    SUPABASE_URL
} from "./supabase-config.js";

async function loadPublishedProjectPhotos() {
    if (!hasSupabaseConfig()) return;

    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
    const { data: photos, error } = await supabase
        .from("project_photos")
        .select("storage_path, alt_text")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Could not load admin-added project photos: ${error.message}`);
    }

    const gallery = document.querySelector(".image-gallery");
    if (!gallery) return;

    photos.forEach((photo) => {
        const image = document.createElement("img");
        image.className = "solar-image";
        image.src = supabase.storage
            .from(PROJECT_PHOTOS_BUCKET)
            .getPublicUrl(photo.storage_path).data.publicUrl;
        image.alt = photo.alt_text;
        image.loading = "lazy";
        image.decoding = "async";
        gallery.append(image);
    });
}

loadPublishedProjectPhotos().catch((error) => {
    console.error(error);
});
