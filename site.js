const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");

if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
        menuButton.setAttribute("aria-expanded", "false");
        navLinks.classList.remove("open");
    }));
}

const currentYear = document.getElementById("current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();

const shareButton = document.getElementById("share-site");
const shareStatus = document.getElementById("share-status");

async function copyWebsiteUrl(url) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(url);
            return;
        } catch {
            // Use the browser copy command as a fallback.
        }
    }

    const copyField = document.createElement("textarea");
    copyField.value = url;
    copyField.setAttribute("readonly", "");
    copyField.style.position = "fixed";
    copyField.style.opacity = "0";
    document.body.append(copyField);
    copyField.select();
    const copied = document.execCommand("copy");
    copyField.remove();
    if (!copied) throw new Error("The browser could not copy the website link.");
}

shareButton?.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.hash = "";
    shareStatus.textContent = "";

    if (typeof navigator.share === "function") {
        try {
            await navigator.share({ title: document.title, text: "Visit SR Solar", url: url.href });
            shareStatus.textContent = "Share options opened.";
            return;
        } catch (error) {
            if (error.name === "AbortError") return;
        }
    }

    try {
        await copyWebsiteUrl(url.href);
        shareStatus.textContent = "Website link copied.";
    } catch {
        shareStatus.textContent = `Copy this website link: ${url.href}`;
    }
});

const contactForm = document.getElementById("contact-form");
const contactSubmit = document.getElementById("contact-submit");
const contactStatus = document.getElementById("contact-status");

contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const inquiry = Object.fromEntries(new FormData(contactForm).entries());
    contactSubmit.disabled = true;
    contactSubmit.textContent = "Sending...";
    contactStatus.textContent = "";
    contactStatus.dataset.state = "";

    try {
        const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(inquiry)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "The contact service is unavailable.");
        contactStatus.textContent = result.message || "Thanks. Your inquiry has been sent to SR Solar.";
        contactStatus.dataset.state = "success";
        contactForm.reset();
    } catch (error) {
        contactStatus.textContent = `${error.message} You can also call 9885798224 or email ssmkssv5@gmail.com.`;
        contactStatus.dataset.state = "error";
    } finally {
        contactSubmit.disabled = false;
        contactSubmit.textContent = "Send inquiry";
    }
});
