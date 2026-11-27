const { app } = require("@azure/functions");

const MAX_BODY_BYTES = 2048;
const MAX_MESSAGE_LENGTH = 1000;

const answers = [
    {
        keywords: ["power outage", "power cut", "electricity cut", "grid outage", "blackout", "outage", "grid failure"],
        answer: "Most grid-connected solar inverters shut down during an outage for safety. Backup power needs compatible equipment, such as a suitable battery and inverter. Ask a qualified installer to check your system."
    },
    {
        keywords: ["battery", "backup", "store electricity", "store power"],
        answer: "A solar battery can store extra electricity for later. The right size depends on what you want to power and for how long. Ask an installer to check battery and inverter compatibility."
    },
    {
        keywords: ["saving", "save money", "electricity bill", "solar cost", "solar price", "payback", "tariff"],
        answer: "Solar savings depend on electricity use, system size, sunlight, tariffs, and local utility rules. SR Solar can discuss a site-specific estimate."
    },
    {
        keywords: ["solar", "panel", "inverter", "installation", "roof", "tirupati", "mr palli"],
        answer: "SR Solar offers solar consultations in Tirupati, near MR Palli Circle. Call 9885798224 to discuss your project."
    },
    {
        keywords: ["real estate", "property", "buying", "selling", "buy a house", "sell a house", "plot", "land"],
        answer: "SR Real Estate can discuss buying, selling, and property enquiries. Share the area and property type you are interested in with the team. Availability and prices depend on each property."
    },
    {
        keywords: ["medical", "doctor", "nurse", "healthcare", "dubai", "licensing", "dha", "visa"],
        answer: "SR Global Consultants can discuss medical job opportunities in Dubai. Roles and eligibility depend on current openings, employer requirements, and licensing rules; no placement or visa outcome is guaranteed."
    }
];

function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function answerFor(message) {
    const normalized = normalize(message);
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/.test(normalized)) {
        return "Hello! Ask me about SR Solar, real estate, or medical job opportunities in Dubai.";
    }
    if (/(contact|email|talk to|speak to|human|team)/.test(normalized)) {
        return "Email the SR Consistency team at ssmkssv5@gmail.com and mention which service you need.";
    }
    return answers.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)))?.answer
        || "I can help with SR Solar, real estate, and medical job opportunities in Dubai. Email ssmkssv5@gmail.com for more help.";
}

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
        return jsonResponse(200, { answer: answerFor(validation.message) }, origin);
    }
});

module.exports = { answerFor, validateMessage };

