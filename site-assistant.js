const knowledge = window.SR_ASSISTANT_KNOWLEDGE;

if (knowledge && !document.querySelector(".sr-assistant")) {
    const { settings } = knowledge;
    const make = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    };

    const assistant = make("aside", "sr-assistant");
    assistant.setAttribute("aria-label", `${settings.brand} assistant`);

    const panel = make("section", "sr-assistant-panel");
    panel.id = "sr-assistant-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "sr-assistant-title");

    const header = make("header", "sr-assistant-header");
    const avatar = make("span", "sr-assistant-avatar", "SR");
    avatar.setAttribute("aria-hidden", "true");
    const title = make("span", "sr-assistant-title");
    const titleText = make("strong", "", settings.brand);
    titleText.id = "sr-assistant-title";
    title.append(titleText, make("small", "", "Service assistant"));
    const closeButton = make("button", "sr-assistant-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close chat");
    header.append(avatar, title, closeButton);

    const messages = make("div", "sr-assistant-messages");
    messages.id = "sr-assistant-messages";
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-live", "polite");
    messages.setAttribute("aria-relevant", "additions text");
    messages.append(make("p", "sr-chat-bubble sr-chat-bubble--bot", settings.greeting));

    const prompts = make("div", "sr-assistant-prompts");
    prompts.setAttribute("role", "group");
    prompts.setAttribute("aria-label", "Choose a topic");
    const promptButtons = settings.prompts.map((prompt) => {
        const button = make("button", "", prompt.label);
        button.type = "button";
        button.dataset.question = prompt.question;
        prompts.append(button);
        return button;
    });

    const form = make("form", "sr-assistant-form");
    form.id = "sr-assistant-form";
    const label = make("label", "sr-only", "Message SR Consistency");
    label.htmlFor = "sr-assistant-input";
    const input = make("input");
    input.id = "sr-assistant-input";
    input.name = "message";
    input.type = "text";
    input.maxLength = 1000;
    input.autocomplete = "off";
    input.placeholder = "Ask about our services…";
    input.required = true;
    const sendButton = make("button", "", "Send");
    sendButton.type = "submit";
    sendButton.setAttribute("aria-label", "Send message");
    form.append(label, input, sendButton);

    const note = make("p", "sr-assistant-note", settings.privacy);
    panel.append(header, messages, prompts, form, note);

    const launcher = make("button", "sr-assistant-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", panel.id);
    launcher.setAttribute("aria-label", "Open SR Consistency chat");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z");
    const iconLines = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconLines.setAttribute("d", "M8 10h8M8 14h5");
    icon.append(iconPath, iconLines);
    launcher.append(icon, make("span", "", "Chat with SR"));
    assistant.append(panel, launcher);
    document.body.append(assistant);

    let busy = false;
    const backendUrl = document.querySelector('meta[name="sr-assistant-api"]')?.content.trim() || "";

    function addMessage(kind, text, action) {
        const bubble = make("p", `sr-chat-bubble sr-chat-bubble--${kind}`, text);
        messages.append(bubble);
        if (action) {
            const link = make("a", "sr-chat-action", action.label);
            link.href = action.href;
            if (action.href.startsWith("https://")) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
            messages.append(link);
        }
        messages.scrollTop = messages.scrollHeight;
    }

    function safeAction(action) {
        if (!action || typeof action.label !== "string" || typeof action.href !== "string") return undefined;
        const labelText = action.label.trim().slice(0, 80);
        if (!labelText) return undefined;
        try {
            const url = new URL(action.href, window.location.href);
            if (url.protocol === "mailto:" && url.pathname.toLowerCase() === settings.email.toLowerCase()) {
                return { label: labelText, href: url.href };
            }
            if (url.protocol === "tel:" && url.pathname.replace(/[^+\d]/g, "") === settings.phone) {
                return { label: labelText, href: url.href };
            }
            if ((url.protocol === "https:" || url.protocol === "http:") && url.origin === window.location.origin) {
                return { label: labelText, href: url.href };
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    async function answerFromBackend(question) {
        if (!backendUrl) return knowledge.answerFor(question);
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
            return { answer: result.answer.slice(0, 1000), action: safeAction(result.action) };
        } catch {
            return knowledge.answerFor(question);
        }
    }

    function setBusy(value) {
        busy = value;
        input.disabled = value;
        sendButton.disabled = value;
        form.setAttribute("aria-busy", String(value));
        promptButtons.forEach((button) => { button.disabled = value; });
        if (value) {
            const typing = make("p", "sr-chat-bubble sr-chat-bubble--bot sr-chat-typing", "SR Consistency is preparing an answer…");
            typing.id = "sr-assistant-typing";
            typing.setAttribute("role", "status");
            messages.append(typing);
            messages.scrollTop = messages.scrollHeight;
        } else {
            document.getElementById("sr-assistant-typing")?.remove();
        }
    }

    async function handleQuestion(question) {
        if (busy || !question) return;
        addMessage("user", question);
        setBusy(true);
        try {
            const response = await answerFromBackend(question);
            addMessage("bot", response.answer, safeAction(response.action));
        } catch {
            const response = knowledge.answerFor(question);
            addMessage("bot", response.answer, safeAction(response.action));
        } finally {
            setBusy(false);
            if (!panel.hidden) input.focus();
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
        if (event.key === "Escape" && !panel.hidden) {
            setOpen(false);
            launcher.focus();
        }
    });
    promptButtons.forEach((button) => {
        button.addEventListener("click", () => handleQuestion(button.dataset.question.trim()));
    });
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question || busy) return;
        input.value = "";
        handleQuestion(question);
    });
}

