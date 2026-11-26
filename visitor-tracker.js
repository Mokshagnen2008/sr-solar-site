import {
    hasSupabaseConfig,
    SUPABASE_PUBLIC_KEY,
    SUPABASE_URL
} from "./supabase-config.js?v=20261125-5";

async function recordSiteVisit() {
    if (!hasSupabaseConfig()) return;

    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
    const { error } = await supabase
        .from("site_visits")
        .insert({ visited_at: new Date().toISOString() });

    if (error) {
        throw new Error(`Could not record site visit: ${error.message}`);
    }
}

recordSiteVisit().catch((error) => {
    console.error(error);
});
