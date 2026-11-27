const assistantMarkup = `
    <aside class="sr-assistant" aria-label="SR Consistency assistant">
        <section class="sr-assistant-panel" id="sr-assistant-panel" role="dialog" aria-label="Chat with SR Consistency" aria-modal="false" hidden>
            <header class="sr-assistant-header">
                <span class="sr-assistant-avatar" aria-hidden="true">SR</span>
                <span class="sr-assistant-title"><strong>SR Consistency</strong><small>Service assistant</small></span>
                <button class="sr-assistant-close" type="button" aria-label="Close chat">×</button>
            </header>
            <div class="sr-assistant-messages" id="sr-assistant-messages" role="log" aria-live="polite" aria-relevant="additions text">
                <p class="sr-chat-bubble sr-chat-bubble--bot">Hi! I can help with SR Solar, real estate, and medical career enquiries in Dubai. What would you like to know?</p>
            </div>
            <div class="sr-assistant-prompts" aria-label="Common questions">
                <button type="button" data-question="Tell me about solar">Solar</button>
                <button type="button" data-question="I have a real estate enquiry">Real Estate</button>
                <button type="button" data-question="I want to know about medical jobs in Dubai">Medical jobs in Dubai</button>
            </div>
            <form class="sr-assistant-form" id="sr-assistant-form">
                <label class="sr-only" for="sr-assistant-input">Message SR Consistency</label>
                <input id="sr-assistant-input" name="message" type="text" maxlength="1000" autocomplete="off" placeholder="Write a message…" required>
                <button type="submit" aria-label="Send message">Send</button>
            </form>
            <p class="sr-assistant-note">Quick answers only. Chat history is not saved.</p>
        </section>
        <button class="sr-assistant-launcher" type="button" aria-expanded="false" aria-controls="sr-assistant-panel" aria-label="Open SR Consistency chat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z"/><path d="M8 10h8M8 14h5"/></svg>
            <span>Chat with SR</span>
        </button>
    </aside>`;

const host = document.createElement("div");
host.innerHTML = assistantMarkup;
document.body.append(host.firstElementChild);

const panel = document.getElementById("sr-assistant-panel");
const launcher = document.querySelector(".sr-assistant-launcher");
const closeButton = document.querySelector(".sr-assistant-close");
const messages = document.getElementById("sr-assistant-messages");
const form = document.getElementById("sr-assistant-form");
const input = document.getElementById("sr-assistant-input");
const sendButton = form.querySelector("button[type='submit']");
const backendUrl = document.querySelector('meta[name="sr-assistant-api"]')?.content.trim() || "";

const responses = [
    {
        keywords: ["power outage", "power cut", "electricity cut", "grid outage", "blackout", "outage", "grid failure", "grid goes down"],
        answer: "Most grid-connected solar inverters shut down during an outage for safety. Backup power needs compatible equipment, such as a suitable battery and inverter. Ask a qualified installer to check your system."
    },
    {
        keywords: ["battery", "backup", "store electricity", "store power"],
        answer: "A solar battery can store extra electricity for later. The right size depends on what you want to power and for how long. Ask an installer to check battery and inverter compatibility."
    },
    {
        keywords: ["clean panel", "clean solar panel", "cleaning", "dust", "dirty panels", "maintenance"],
        answer: "Cleaning needs depend on local dust and rain. Follow the panel maker's guidance, and use a qualified professional if cleaning requires roof access."
    },
    {
        keywords: ["saving", "save money", "electricity bill", "bill", "solar cost", "solar price", "payback", "tariff"],
        answer: "Solar savings depend on electricity use, system size, sunlight, tariffs, and local utility rules. SR Solar can discuss a site-specific estimate."
    },
    {
        keywords: ["install", "installation", "roof", "site survey", "site assessment", "permit"],
        answer: "A solar installation usually starts with a site assessment of roof space, shade, structure, wiring, and utility requirements. A qualified installer can explain system size, approvals, equipment, and warranties."
    },
    {
        keywords: ["inverter", "convert dc", "dc to ac", "solar work", "solar panel work", "how do solar"],
        answer: "Solar panels turn sunlight into direct-current electricity. An inverter converts it to alternating current for appliances. Whether extra power goes to a battery or the grid depends on the system and local rules."
    },
    {
        keywords: ["real estate", "property", "buy a house", "buying a house", "sell a house", "selling a house", "plot", "land"],
        answer: "SR Real Estate can discuss buying, selling, and property enquiries. Share the area and type of property you are interested in, and the team can follow up. Availability and prices depend on each property.",
        action: { label: "Email the team", href: "mailto:ssmkssv5@gmail.com?subject=SR%20Real%20Estate%20enquiry" }
    },
    {
        keywords: ["medical", "doctor", "nurse", "healthcare", "dubai job", "jobs in dubai", "career in dubai", "licensing", "dha", "visa"],
        answer: "SR Global Consultants can discuss medical job opportunities in Dubai. Roles and eligibility depend on current openings, employer requirements, and applicable licensing rules; no placement or visa outcome is guaranteed.",
        action: { label: "Ask about opportunities", href: "mailto:ssmkssv5@gmail.com?subject=Medical%20jobs%20in%20Dubai" }
    },
    {
        keywords: ["phone", "call", "solar contact", "solar quote", "solar appointment", "tirupati", "mr palli", "location"],
        answer: "SR Solar serves Tirupati, near MR Palli Circle. Call 9885798224 to discuss a solar consultation or quote.",
        action: { label: "Call SR Solar", href: "tel:+919885798224" }
    }
];

function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function answerLocally(question) {
    const normalized = normalize(question);
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/.test(normalized)) {
        return { text: "Hello! Ask me about solar, real estate, or medical careers in Dubai." };
    }
    if (/(contact|email|talk to|speak to|human|team)/.test(normalized)) {
        return {
            text: "You can email the SR Consistency team and mention which service you need.",
            action: { label: "Email SR Consistency", href: "mailto:ssmkssv5@gmail.com?subject=SR%20Consistency%20enquiry" }
        };
    }
    const match = responses.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
    return match
        ? { text: match.answer, action: match.action }
        : {
            text: "I can help with SR Solar, real estate, and medical job opportunities in Dubai. Choose a topic above or email our team for more help.",
            action: { label: "Email SR Consistency", href: "mailto:ssmkssv5@gmail.com?subject=SR%20Consistency%20enquiry" }
        };
}

function safeAction(action) {
    if (!action || typeof action.label !== "string" || typeof action.href !== "string") return undefined;
    if (!/^(https:\/\/|mailto:|tel:)/i.test(action.href)) return undefined;
    return { label: action.label.slice(0, 80), href: action.href };
}

function addMessage(kind, text, action) {
    const bubble = document.createElement("p");
    bubble.className = `sr-chat-bubble sr-chat-bubble--${kind}`;
    bubble.textContent = text;
    messages.append(bubble);
    if (action) {
        const link = document.createElement("a");
        link.className = "sr-chat-action";
        link.href = action.href;
        link.textContent = action.label;
        if (action.href.startsWith("https://")) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
        messages.append(link);
    }
    messages.scrollTop = messages.scrollHeight;
}

async function answerFromBackend(question) {
    if (!backendUrl) return answerLocally(question);
    try {
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: question }),
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error("Assistant service unavailable");
        const result = await response.json();
        if (typeof result.answer !== "string" || !result.answer.trim()) throw new Error("Invalid assistant response");
        return { text: result.answer, action: safeAction(result.action) };
    } catch {
        return answerLocally(question);
    }
}

function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
}

launcher.addEventListener("click", () => setOpen(panel.hidden));
closeButton.addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
});
document.querySelectorAll(".sr-assistant-prompts [data-question]").forEach((button) => {
    button.addEventListener("click", async () => {
        const question = button.dataset.question;
        addMessage("user", question);
        const response = await answerFromBackend(question);
        addMessage("bot", response.text, response.action);
    });
});
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || sendButton.disabled) return;
    addMessage("user", question);
    input.value = "";
    sendButton.disabled = true;
    sendButton.textContent = "…";
    const response = await answerFromBackend(question);
    addMessage("bot", response.text, response.action);
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    input.focus();
});

