
const chat = document.getElementById("chat");
const input = document.getElementById("message");
const sendButton = document.getElementById("send");
const typing = document.getElementById("typing");

let history = [];


async function sendMessage() {

    const message = input.value.trim();

    if (!message) {
        return;
    }


    addMessage(
        "user",
        message
    );


    input.value = "";
    input.style.height = "auto";

    setLoading(true);


    try {

        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    history: history
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Server error"
            );

        }


        addMessage(
            "ai",
            data.reply
        );


        history.push({
            role: "user",
            content: message
        });


        history.push({
            role: "assistant",
            content: data.reply
        });


        if (history.length > 20) {
            history = history.slice(-20);
        }


    } catch (error) {

        addMessage(
            "ai",
            "Error: " + error.message
        );

    }


    setLoading(false);
}


function addMessage(role, text) {

    const welcome =
        document.getElementById("welcome");


    if (welcome) {
        welcome.remove();
    }


    const message =
        document.createElement("div");


    message.className =
        "message " +
        (
            role === "user"
            ? "user-message"
            : "ai-message"
        );


    const avatar =
        document.createElement("div");


    avatar.className =
        "avatar " +
        (
            role === "user"
            ? "user-avatar"
            : "ai-avatar"
        );


    avatar.textContent =
        role === "user"
        ? "YOU"
        : "Σ";


    const body =
        document.createElement("div");

    body.className =
        "message-body";


    const roleText =
        document.createElement("div");

    roleText.className =
        "role";

    roleText.textContent =
        role === "user"
        ? "YOU"
        : "LA TUTOR";


    const content =
        document.createElement("div");

    content.className =
        "content";


    if (role === "ai") {

        content.innerHTML = markdown(text);

    } else {

        content.textContent = text;

    }


    body.appendChild(roleText);
    body.appendChild(content);

    message.appendChild(avatar);
    message.appendChild(body);

    chat.appendChild(message);

 // Render LaTeX equations with MathJax
if (role === "ai" && window.MathJax) {
    MathJax.startup.promise.then(function () {
        MathJax.typesetPromise([content]).catch(function (error) {
            console.error("MathJax rendering error:", error);
        });
    });
}

    scrollBottom();
}

function markdown(text) {
    // ---------------------------------------------------------
    // Safely protect LaTeX before processing Markdown.
    // This prevents Markdown processing from destroying
    // LaTeX backslashes, matrices, equations, etc.
    // ---------------------------------------------------------

    const mathBlocks = [];
    const codeBlocks = [];

    function saveMath(match) {
        const token = `MATHBLOCK${mathBlocks.length}END`;
        mathBlocks.push(match);
        return token;
    }

    function saveCode(match) {
        const token = `CODEBLOCK${codeBlocks.length}END`;

        // Remove the ``` markers
        let code = match.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
        code = code.replace(/```$/, "");

        codeBlocks.push(code);
        return token;
    }

    let protectedText = text;

    // ---------------------------------------------------------
    // 1. Protect code blocks first
    // ---------------------------------------------------------
    protectedText = protectedText.replace(
        /```[\s\S]*?```/g,
        saveCode
    );

    // ---------------------------------------------------------
    // 2. Protect display LaTeX
    // ---------------------------------------------------------

    // $$ ... $$
    protectedText = protectedText.replace(
        /\$\$[\s\S]*?\$\$/g,
        saveMath
    );

    // \[ ... \]
    protectedText = protectedText.replace(
        /\\\[[\s\S]*?\\\]/g,
        saveMath
    );

    // ---------------------------------------------------------
    // 3. Protect inline LaTeX
    // ---------------------------------------------------------

    // \( ... \)
    protectedText = protectedText.replace(
        /\\\([\s\S]*?\\\)/g,
        saveMath
    );

    // $ ... $
    protectedText = protectedText.replace(
        /\$([^\$\n]+)\$/g,
        saveMath
    );

    // ---------------------------------------------------------
    // 4. Escape normal HTML
    // ---------------------------------------------------------
    let html = escapeHTML(protectedText);

    // ---------------------------------------------------------
    // 5. Markdown headings
    // ---------------------------------------------------------

    html = html.replace(
        /^###### (.*)$/gm,
        "<h6>$1</h6>"
    );

    html = html.replace(
        /^##### (.*)$/gm,
        "<h5>$1</h5>"
    );

    html = html.replace(
        /^#### (.*)$/gm,
        "<h4>$1</h4>"
    );

    html = html.replace(
        /^### (.*)$/gm,
        "<h3>$1</h3>"
    );

    html = html.replace(
        /^## (.*)$/gm,
        "<h2>$1</h2>"
    );

    html = html.replace(
        /^# (.*)$/gm,
        "<h1>$1</h1>"
    );

    // ---------------------------------------------------------
    // 6. Bold and italic
    // ---------------------------------------------------------

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
        "<em>$1</em>"
    );

    // ---------------------------------------------------------
    // 7. Bullet points
    // ---------------------------------------------------------

    html = html.replace(
        /^[ \t]*[-*] (.*)$/gm,
        "<li>$1</li>"
    );

    // Group consecutive <li> elements
    html = html.replace(
        /(<li>.*?<\/li>\n?)+/gs,
        function(match) {
            return "<ul>" + match + "</ul>";
        }
    );

    // ---------------------------------------------------------
    // 8. Numbered lists
    // ---------------------------------------------------------

    html = html.replace(
        /^[ \t]*\d+\.\s+(.*)$/gm,
        "<li>$1</li>"
    );

    // ---------------------------------------------------------
    // 9. Horizontal lines
    // ---------------------------------------------------------

    html = html.replace(
        /^---+$/gm,
        "<hr>"
    );

    // ---------------------------------------------------------
    // 10. Line breaks
    // ---------------------------------------------------------

    html = html.replace(/\n/g, "<br>");

    // ---------------------------------------------------------
    // 11. Restore LaTeX
    // ---------------------------------------------------------

    mathBlocks.forEach(function(math, index) {
        const token = `MATHBLOCK${index}END`;

        html = html.replace(
            token,
            math
        );
    });

    // ---------------------------------------------------------
    // 12. Restore code blocks
    // ---------------------------------------------------------

    codeBlocks.forEach(function(code, index) {
        const token = `CODEBLOCK${index}END`;

        const escapedCode = escapeHTML(code);

        html = html.replace(
            token,
            `<pre><code>${escapedCode}</code></pre>`
        );
    });

    return html;
}


function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


function ask(text) {

    input.value = text;

    sendMessage();
}


function newChat() {

    history = [];

    location.reload();
}


function setLoading(value) {

    typing.classList.toggle(
        "hidden",
        !value
    );

    sendButton.disabled =
        value;

    input.disabled =
        value;

    if (value) {
        scrollBottom();
    }
}


function scrollBottom() {

    setTimeout(
        () => {

            chat.scrollTop =
                chat.scrollHeight;

        },
        50
    );
}


input.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


input.addEventListener(
    "input",
    function() {

        this.style.height = "auto";

        this.style.height =
            Math.min(
                this.scrollHeight,
                150
            ) + "px";

    }
);
