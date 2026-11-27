/* Shared public answers and settings for the SR Consistency website assistant. */
(function (root, factory) {
    const knowledge = factory();
    if (typeof module !== "undefined" && module.exports) module.exports = knowledge;
    if (root) root.SR_ASSISTANT_KNOWLEDGE = knowledge;
})(typeof window !== "undefined" ? window : globalThis, function () {
    const settings = {
        brand: "SR Consistency",
        email: "ssmkssv5@gmail.com",
        phone: "+919885798224",
        greeting: "Hello! I can point you to information about SR Solar, real estate, and medical career enquiries in Dubai. Choose a topic or ask a question.",
        fallback: "I can help with SR Solar, real estate, and medical career enquiries in Dubai. Choose a topic below, or email the team and mention the service you need.",
        privacy: "Quick answers only. Messages are not saved. Please do not send passwords, payment details, or medical documents.",
        prompts: [
            { label: "Solar", question: "Tell me about SR Solar" },
            { label: "Real estate", question: "I have a real estate enquiry" },
            { label: "Medical jobs in Dubai", question: "I want to know about medical jobs in Dubai" },
            { label: "Contact the team", question: "How can I contact the team?" }
        ],
        links: {
            solar: "solar.html",
            realEstate: "real-estate.html",
            careers: "global-consultants.html"
        }
    };

    const emailAction = (subject, label) => ({
        label,
        href: `mailto:${settings.email}?subject=${encodeURIComponent(subject)}`
    });

    const entries = [
        {
            keywords: ["password", "passport", "payment detail", "bank detail", "medical document", "sensitive document", "upload a document", "send my documents"],
            answer: "Please do not share passwords, payment or bank details, passports, or medical documents in this chat. It is a public FAQ and does not upload files. Email the team first if you need a secure way to share information."
        },
        {
            keywords: ["power outage", "power cut", "electricity cut", "grid outage", "blackout", "outage", "grid failure", "grid goes down"],
            answer: "Most grid-connected solar inverters shut down during an outage for safety. Backup power needs compatible equipment, such as a suitable battery and inverter. Ask a qualified installer to check your system."
        },
        {
            keywords: ["battery", "backup", "store electricity", "store power"],
            answer: "A solar battery can store extra electricity for later. The right size depends on what you want to power and for how long. Ask an installer to check battery and inverter compatibility.",
            action: { label: "Explore SR Solar", href: settings.links.solar }
        },
        {
            keywords: ["clean panel", "clean solar panel", "cleaning", "dust", "dirty panels", "maintenance"],
            answer: "Cleaning needs depend on local dust and rain. Follow the panel maker's guidance, and use a qualified professional if cleaning requires roof access."
        },
        {
            keywords: ["saving", "save money", "electricity bill", "bill", "solar cost", "solar price", "payback", "tariff", "quote", "estimate"],
            answer: "Solar savings and project costs depend on electricity use, system size, sunlight, tariffs, site conditions, and local utility rules. SR Solar can discuss a site-specific estimate; the assistant cannot quote a price.",
            action: emailAction("SR Solar enquiry", "Ask SR Solar")
        },
        {
            keywords: ["install", "installation", "roof", "site survey", "site assessment", "permit"],
            answer: "A solar installation usually starts with a site assessment of roof space, shade, structure, wiring, and utility requirements. A qualified installer can explain system size, approvals, equipment, and warranties.",
            action: { label: "Explore SR Solar", href: settings.links.solar }
        },
        {
            keywords: ["inverter", "convert dc", "dc to ac", "how do solar", "how solar works", "solar panel work"],
            answer: "Solar panels turn sunlight into direct-current electricity. An inverter converts it to alternating current for appliances. Whether extra power goes to a battery or the grid depends on the system and local rules."
        },
        {
            keywords: ["solar", "solar energy", "solar panel", "sr solar"],
            answer: "SR Solar provides solar consultations in Tirupati, near MR Palli Circle. A site assessment helps the team understand your needs and discuss suitable options.",
            action: { label: "Visit the SR Solar page", href: settings.links.solar }
        },
        {
            keywords: ["property available", "available property", "listing", "properties", "real estate", "property", "house", "apartment", "plot", "land"],
            answer: "SR Real Estate handles property enquiries. Availability, locations, and prices can change, so the team must confirm current listings. Tell them the area and property type you are interested in.",
            action: { label: "Visit the Real Estate page", href: settings.links.realEstate }
        },
        {
            keywords: ["buy", "buying", "sell", "selling", "rent", "renting", "lease", "commercial property"],
            answer: "SR Real Estate can discuss buying, selling, and rental enquiries. Share the area, property type, and whether you want to buy, sell, or rent; the team can confirm current options.",
            action: emailAction("SR Real Estate enquiry", "Email Real Estate")
        },
        {
            keywords: ["medical", "doctor", "nurse", "healthcare", "dubai job", "jobs in dubai", "career in dubai", "licensing", "dha", "visa", "job", "career"],
            answer: "SR Global Consultants can discuss medical job opportunities in Dubai. Roles and eligibility depend on current openings, employer requirements, and applicable licensing rules. No placement or visa outcome is guaranteed.",
            action: { label: "Visit SR Global Consultants", href: settings.links.careers }
        },
        {
            keywords: ["resume", "cv", "apply", "application", "documents", "recruitment"],
            answer: "For medical career enquiries, tell SR Global Consultants your profession and the kind of role you are exploring. Do not send passport, medical, or other sensitive documents through this chat; the team can advise on a secure next step.",
            action: emailAction("Medical career enquiry in Dubai", "Email SR Global Consultants")
        },
        {
            keywords: ["phone", "call", "solar contact", "appointment", "tirupati", "mr palli", "location", "address"],
            answer: "SR Solar serves Tirupati, near MR Palli Circle. Call 9885798224 to discuss a solar consultation or quote.",
            action: { label: "Call SR Solar", href: `tel:${settings.phone}` }
        }
    ];

    const contactAction = emailAction("SR Consistency enquiry", "Email SR Consistency");

    function normalize(value) {
        return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    }

    function containsPhrase(text, phrase) {
        return (` ${text} `).includes(` ${normalize(phrase)} `);
    }

    function answerFor(question) {
        const normalized = normalize(question);
        if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/.test(normalized)) {
            return { answer: settings.greeting };
        }
        if (/(contact|email|talk to|speak to|human|team)/.test(normalized)) {
            return { answer: "Email the SR Consistency team and mention whether your enquiry is about solar, real estate, or medical careers.", action: contactAction };
        }

        let best = null;
        let bestScore = 0;
        for (const entry of entries) {
            const matched = entry.keywords.filter((keyword) => containsPhrase(normalized, keyword));
            const score = matched.reduce((total, keyword) => total + keyword.length + 4, 0);
            if (score > bestScore) {
                best = entry;
                bestScore = score;
            }
        }
        return best ? { answer: best.answer, action: best.action } : { answer: settings.fallback, action: contactAction };
    }

    return { settings, entries, answerFor };
});

