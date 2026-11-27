const { app } = require("@azure/functions");
const { answerFor } = require("../../../assistant-knowledge");

const MAX_BODY_BYTES = 2048;
const MAX_MESSAGE_LENGTH = 1000;

function allowedOrigins() {
    return new Set((process.env.ASSISTANT_ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean));
}

function corsHeaders(origin) {
    const allowed = allowedOrigins();
    if (!origin || !allowed.has(origin)) return {};
    return {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "vary": "Origin"
    };
}

function jsonResponse(status, body, origin) {
    return {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...corsHeaders(origin)
        },
        jsonBody: body
    };
}

function validateMessage(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { error: "Send a message as JSON." };
    }
    const message = typeof value.message === "string" ? value.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
        return { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` };
    }
    return { message };
}

app.http("assistant", {
    methods: ["POST", "OPTIONS"],
    authLevel: "anonymous",
    route: "assistant",
    handler: async (request) => {
        const origin = request.headers.get("origin") || "";
        if (request.method === "OPTIONS") {
            if (origin && !allowedOrigins().has(origin)) return { status: 403 };
            return { status: 204, headers: corsHeaders(origin) };
        }

        const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "application/json" && !contentType.endsWith("+json")) {
            return jsonResponse(415, { error: "Send the message as JSON." }, origin);
        }
        const declaredLength = Number(request.headers.get("content-length") || 0);
        if (declaredLength > MAX_BODY_BYTES) return jsonResponse(413, { error: "The message is too large." }, origin);

        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse(400, { error: "The request body must be valid JSON." }, origin);
        }
        if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
            return jsonResponse(413, { error: "The message is too large." }, origin);
        }

        const validation = validateMessage(body);
        if (validation.error) return jsonResponse(400, { error: validation.error }, origin);
        return jsonResponse(200, answerFor(validation.message), origin);
    }
});

module.exports = { answerFor, validateMessage };

