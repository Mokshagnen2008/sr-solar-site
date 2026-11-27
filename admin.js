import {
    ADMIN_EMAIL,
    hasSupabaseConfig,
    MAX_IMAGE_BYTES,
    PROJECT_PHOTOS_BUCKET,
    SUPABASE_PUBLIC_KEY,
    SUPABASE_URL
} from "./supabase-config.js?v=20261125-5";

const setupGuide = document.getElementById("setup-guide");
const loginForm = document.getElementById("login-form");
const adminEmailInput = document.getElementById("admin-email");
const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");
const adminTools = document.getElementById("admin-tools");
const uploadForm = document.getElementById("upload-form");
const uploadButton = document.getElementById("upload-button");
const uploadStatus = document.getElementById("upload-status");
const photoFileInput = document.getElementById("photo-file");
const photoPreview = document.getElementById("photo-preview");
const photoList = document.getElementById("admin-photo-list");
const signoutButton = document.getElementById("signout-button");
const visitorTotal = document.getElementById("visitor-total");
const visitorStatus = document.getElementById("visitor-status");

function setStatus(element, message, state) {
    element.textContent = message;
    element.dataset.state = state || "";
}

function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

function photoBackendMessage(error, resource) {
    const details = errorMessage(error);
    const code = typeof error?.code === "string" ? error.code : "";
    if (code === "PGRST205" || code === "42P01" || /relation .* does not exist|could not find the table/i.test(details)) {
        return `The ${resource} database setup is missing. Run supabase-setup.sql in the Supabase SQL Editor, then reload this page. (${details})`;
    }
    if (code === "42501" || /row-level security|permission denied|not allowed/i.test(details)) {
        return `Supabase denied access to ${resource}. Confirm the verified account is ${ADMIN_EMAIL} and run supabase-setup.sql. (${details})`;
    }
    if (/bucket.*not found|bucket.*does not exist/i.test(details)) {
        return `The ${PROJECT_PHOTOS_BUCKET} photo bucket is missing. Run supabase-setup.sql in the Supabase SQL Editor. (${details})`;
    }
    return details;
}

function authCallbackError() {
    const callbackParams = new URLSearchParams(window.location.hash.slice(1));
    return callbackParams.get("error_description") || callbackParams.get("error") || "";
}

function setBusy(button, busy, idleLabel, busyLabel) {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : idleLabel;
}

function publicPhotoUrl(supabase, storagePath) {
    return supabase.storage.from(PROJECT_PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

let previewObjectUrl = "";

function clearPhotoPreview() {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
    photoPreview.removeAttribute("src");
    photoPreview.hidden = true;
}

photoFileInput.addEventListener("change", () => {
    clearPhotoPreview();
    const file = photoFileInput.files[0];
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES) return;
    previewObjectUrl = URL.createObjectURL(file);
    photoPreview.src = previewObjectUrl;
    photoPreview.hidden = false;
});

uploadForm.addEventListener("reset", () => window.setTimeout(clearPhotoPreview, 0));

async function startAdmin() {
    if (!hasSupabaseConfig()) {
        setupGuide.hidden = false;
        loginForm.hidden = false;
        loginButton.disabled = true;
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            setStatus(loginStatus, "Sign-in is unavailable until Supabase is configured.", "error");
        });
        setStatus(loginStatus, "Admin sign-in is disabled until a valid Supabase project URL and public key are configured.", "error");
        return;
    }

    setupGuide.hidden = false;
    loginForm.hidden = false;
    loginButton.disabled = false;

    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
            // This GitHub Pages admin is browser-only. Implicit flow avoids
            // requiring a PKCE verifier from the browser that requested email.
            flowType: "implicit",
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    async function loadPhotoList() {
        const { data: photos, error } = await supabase
            .from("project_photos")
            .select("id, storage_path, alt_text, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(photoBackendMessage(error, "project photos"));
        }

        photoList.replaceChildren();
        if (!Array.isArray(photos) || photos.length === 0) {
            const emptyMessage = document.createElement("li");
            emptyMessage.className = "admin-intro";
            emptyMessage.textContent = "No admin-added photos yet.";
            photoList.append(emptyMessage);
            return;
        }

        photos.forEach((photo) => {
            const item = document.createElement("li");
            const image = document.createElement("img");
            const description = document.createElement("h3");
            const removeButton = document.createElement("button");

            item.className = "admin-photo";
            image.src = publicPhotoUrl(supabase, photo.storage_path);
            image.alt = photo.alt_text;
            image.loading = "lazy";
            description.textContent = photo.alt_text;
            removeButton.type = "button";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", () => {
                removePhoto(photo).catch((error) => {
                    setStatus(uploadStatus, `Could not remove the photo: ${errorMessage(error)}`, "error");
                });
            });

            item.append(image, description, removeButton);
            photoList.append(item);
        });
    }

    async function loadVisitorCount() {
        const { count, error } = await supabase
            .from("site_visits")
            .select("id", { count: "exact", head: true });

        if (error) {
            throw new Error(photoBackendMessage(error, "site visits"));
        }
        if (count === null) {
            throw new Error("Supabase did not return a site visit count.");
        }

        visitorTotal.textContent = count.toLocaleString();
        setStatus(visitorStatus, "", "");
    }

    async function showSession(session) {
        if (!session) {
            adminTools.hidden = true;
            setupGuide.hidden = false;
            loginForm.hidden = false;
            const callbackError = authCallbackError();
            if (callbackError) {
                setStatus(loginStatus, `Email verification did not finish: ${callbackError}. Request a fresh link and open it again.`, "error");
            } else {
                setStatus(loginStatus, "Request a one-time sign-in link to open the admin tools.", "");
            }
            return;
        }

        if (session.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                throw new Error(`This email is not authorized, and sign-out failed: ${error.message}`);
            }
            adminTools.hidden = true;
            loginForm.hidden = false;
            setStatus(loginStatus, `Access denied. Only ${ADMIN_EMAIL} is authorized.`, "error");
            return;
        }

        loginForm.hidden = true;
        setupGuide.hidden = true;
        adminTools.hidden = false;
        setStatus(loginStatus, "", "");

        try {
            await loadPhotoList();
        } catch (error) {
            setStatus(uploadStatus, errorMessage(error), "error");
        }
        try {
            await loadVisitorCount();
        } catch (error) {
            visitorTotal.textContent = "Unavailable";
            setStatus(visitorStatus, errorMessage(error), "error");
        }
    }

    supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => {
            showSession(session).catch((error) => {
                setStatus(loginStatus, `Could not verify the sign-in session: ${errorMessage(error)}`, "error");
            });
        }, 0);
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = adminEmailInput.value.trim();
        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            setStatus(loginStatus, "Enter the authorized admin email address.", "error");
            return;
        }

        setBusy(loginButton, true, "Email me a verification link", "Sending verification link...");
        setStatus(loginStatus, "", "");

        try {
            const redirectUrl = new URL("./admin.html", window.location.href);
            redirectUrl.search = "";
            redirectUrl.hash = "";
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: redirectUrl.href,
                    shouldCreateUser: true
                }
            });

            if (error) throw error;
            setStatus(loginStatus, `A one-time sign-in link was sent to ${email}. Open that email link on the device you want to use for the admin session.`, "success");
        } catch (error) {
            setStatus(loginStatus, `Could not send the sign-in link: ${errorMessage(error)}`, "error");
        } finally {
            setBusy(loginButton, false, "Email me a verification link", "Sending verification link...");
        }
    });

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fileInput = document.getElementById("photo-file");
        const altInput = document.getElementById("photo-alt");
        const file = fileInput.files[0];
        const altText = altInput.value.trim();
        const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        if (!file || !allowedTypes[file.type]) {
            setStatus(uploadStatus, "Choose a JPEG, PNG, or WebP image.", "error");
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setStatus(uploadStatus, "The image must be 10 MB or smaller.", "error");
            return;
        }
        if (!altText || altText.length > 160) {
            setStatus(uploadStatus, "Enter a photo description of 1–160 characters.", "error");
            return;
        }

        setBusy(uploadButton, true, "Upload project photo", "Uploading...");
        setStatus(uploadStatus, "", "");
        const storagePath = `${crypto.randomUUID()}.${allowedTypes[file.type]}`;
        let uploaded = false;

        try {
            const { error: uploadError } = await supabase.storage
                .from(PROJECT_PHOTOS_BUCKET)
                .upload(storagePath, file, {
                    cacheControl: "3600",
                    contentType: file.type,
                    upsert: false
                });
            if (uploadError) throw new Error(photoBackendMessage(uploadError, "photo storage"));
            uploaded = true;

            const { error: recordError } = await supabase
                .from("project_photos")
                .insert({ storage_path: storagePath, alt_text: altText });

            if (recordError) throw new Error(photoBackendMessage(recordError, "project photos"));

            uploaded = false;
            uploadForm.reset();
            setStatus(uploadStatus, "Photo added to the Projects gallery.", "success");
            await loadPhotoList();
        } catch (error) {
            let message = errorMessage(error);
            if (uploaded) {
                try {
                    const { error: cleanupError } = await supabase.storage
                        .from(PROJECT_PHOTOS_BUCKET)
                        .remove([storagePath]);
                    if (cleanupError) {
                        message += `. Uploaded file cleanup failed: ${cleanupError.message}`;
                    }
                } catch (cleanupError) {
                    message += `. Uploaded file cleanup failed: ${errorMessage(cleanupError)}`;
                }
            }
            setStatus(uploadStatus, message, "error");
        } finally {
            setBusy(uploadButton, false, "Upload project photo", "Uploading...");
        }
    });

    async function removePhoto(photo) {
        if (!window.confirm(`Remove "${photo.alt_text}" from the Projects gallery?`)) return;

        setStatus(uploadStatus, "", "");
        const { error: recordError } = await supabase
            .from("project_photos")
            .delete()
            .eq("id", photo.id);
        if (recordError) throw new Error(photoBackendMessage(recordError, "project photos"));

        const { error: storageError } = await supabase.storage
            .from(PROJECT_PHOTOS_BUCKET)
            .remove([photo.storage_path]);
        if (storageError) {
            setStatus(uploadStatus, `Photo removed from the gallery, but its storage file could not be deleted: ${photoBackendMessage(storageError, "photo storage")}`, "error");
        } else {
            setStatus(uploadStatus, "Photo removed from the Projects gallery.", "success");
        }

        await loadPhotoList();
    }

    signoutButton.addEventListener("click", async () => {
        signoutButton.disabled = true;
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setStatus(loginStatus, "You have been signed out.", "success");
        } catch (error) {
            setStatus(loginStatus, `Could not sign out: ${errorMessage(error)}`, "error");
        } finally {
            signoutButton.disabled = false;
        }
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
        setStatus(loginStatus, `Could not read the sign-in session: ${error.message}`, "error");
        return;
    }
    await showSession(data.session);
}

startAdmin().catch((error) => {
    setStatus(loginStatus, `Admin setup error: ${errorMessage(error)}`, "error");
});

