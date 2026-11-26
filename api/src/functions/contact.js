const { app } = require("@azure/functions");

const MAX_BODY_BYTES = 8 * 1024;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 32;
const MAX_MESSAGE_LENGTH = 2000;

function jsonResponse(status, body) {
    return {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
        jsonBody: body
    };
}

function validateInquiry(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { error: "Enter your contact details and message." };
    }

    const name = typeof value.name === "string" ? value.name.trim() : "";
    const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
    const phone = typeof value.phone === "string" ? value.phone.trim() : "";
    const message = typeof value.message === "string" ? value.message.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH) {
        return { error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` };
    }
    if (!email || email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Enter a valid email address." };
    }
    if (phone.length > MAX_PHONE_LENGTH || (phone && !/^[+\d().\s-]+$/.test(phone))) {
        return { error: "Enter a valid phone number, or leave it blank." };
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
        return { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` };
    }

    return { inquiry: { name, email, phone: phone || null, message } };
}

app.http("contact", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "contact",
    handler: async (request, context) => {
        const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "application/json" && !contentType.endsWith("+json")) {
            return jsonResponse(415, { error: "Send the inquiry as JSON." });
        }

        const declaredLength = Number(request.headers.get("content-length") || 0);
        if (declaredLength > MAX_BODY_BYTES) {
            return jsonResponse(413, { error: "The inquiry is too large." });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse(400, { error: "The request body must be valid JSON." });
        }

        if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
            return jsonResponse(413, { error: "The inquiry is too large." });
        }

        const validation = validateInquiry(body);
        if (validation.error) return jsonResponse(400, { error: validation.error });

        const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) {
            context.error("Contact endpoint is missing its Supabase server configuration.");
            return jsonResponse(503, { error: "The contact service is not configured yet. Please call 9885798224." });
        }

        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/contact_inquiries`, {
                method: "POST",
                headers: {
                    apikey: serviceRoleKey,
                    authorization: `Bearer ${serviceRoleKey}`,
                    "content-type": "application/json",
                    prefer: "return=minimal"
                },
                body: JSON.stringify(validation.inquiry),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                const details = await response.text();
                context.error(`Supabase rejected an inquiry (${response.status}): ${details.slice(0, 500)}`);
                return jsonResponse(502, { error: "We could not save your inquiry. Please call 9885798224." });
            }

            return jsonResponse(201, { message: "Thanks. Your inquiry has been sent to SR Solar." });
        } catch (error) {
            context.error("Could not reach Supabase while saving an inquiry.", error);
            return jsonResponse(502, { error: "We could not reach the contact service. Please call 9885798224." });
        }
    }
});

module.exports = { validateInquiry };
