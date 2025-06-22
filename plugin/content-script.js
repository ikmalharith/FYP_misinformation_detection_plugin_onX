const BACKEND_URL = "http://127.0.0.1:5000/analyze";

function addFloatingAnalyzeButton() {
    if (document.getElementById("floating-analyze-btn")) return;

    const button = document.createElement("button");
    button.id = "floating-analyze-btn";
    button.textContent = "Analyze Tweet";
    Object.assign(button.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: "9999",
        padding: "10px 14px",
        backgroundColor: "#007bff",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
    });

    button.addEventListener("click", handleAnalyzeClick);
    document.body.appendChild(button);
}

function getVisibleTweetElement() {
    const tweets = Array.from(document.querySelectorAll("article"));
    for (let tweet of tweets) {
        if (tweet.querySelector("div[lang]") && tweet.getBoundingClientRect().top > 0) {
            return tweet;
        }
    }
    return null;
}

function handleAnalyzeClick() {
    const tweetElement = getVisibleTweetElement();
    if (!tweetElement) return alert("No visible tweet found.");

    const tweetText = tweetElement.querySelector("div[lang]")?.innerText;
    if (!tweetText) return alert("Could not extract tweet text.");

    showResultPopup("Analyzing...", null);

    fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tweetText })
    })
    .then(res => res.json())
    .then(data => {
        const verdict = data.summary || "unknown";
        showResultPopup(verdict, data);
    })
    .catch(err => {
        console.error(err);
        showResultPopup("Error analyzing tweet", null);
    });
}

function showResultPopup(verdict, data) {
    document.getElementById("misinfo-result-popup")?.remove();
    document.getElementById("misinfo-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "misinfo-overlay";
    Object.assign(overlay.style, {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: "9998"
    });

    const popup = document.createElement("div");
    popup.id = "misinfo-result-popup";
    Object.assign(popup.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "380px",
        maxHeight: "80vh",
        overflowY: "auto",
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        zIndex: "9999",
        fontFamily: "Arial, sans-serif"
    });

    let verdictColor = "#999";
    let verdictLabel = (verdict || "unknown").toUpperCase();
    if (verdict === "factual") {
        verdictColor = "green";
        verdictLabel = "FACT ✅";
    } else if (verdict === "misinformation") {
        verdictColor = "red";
        verdictLabel = "MISINFO ❌";
    } else if (verdict === "opinion") {
        verdictColor = "orange";
        verdictLabel = "OPINION ⚠️";
    }

    const huggingface = data?.huggingface || {};
    const detailed = data?.detailed_analysis || [];
    const firstDetail = detailed[0] || {};
    const claim = firstDetail.google?.[0] || {};
    const cb = firstDetail.claimbuster || {};

    popup.innerHTML = `
        <div style="font-weight: bold; font-size: 18px; color: ${verdictColor}; margin-bottom: 10px;">
            Verdict: ${verdictLabel}
        </div>

        <button id="toggle-details" style="margin-bottom: 10px; background: none; border: none; color: #007bff; cursor: pointer; font-size: 13px;">
            Show Details ▼
        </button>

        <div id="details-section" style="display: none; font-size: 13px; color: black;">
            <strong>Hugging Face:</strong><br>
            ${huggingface.labels && huggingface.scores ? huggingface.labels.map((label, idx) =>
                `${label}: ${(huggingface.scores[idx] || 0).toFixed(4)}`
            ).join("<br>") : "No result"}<br><br>

            <strong>Google Fact Check:</strong><br>
            <em>Claim:</em> ${claim.text || "No claim"}<br>
            <em>Rating:</em> ${claim.rating || "N/A"}<br><br>

            <strong>ClaimBuster:</strong><br>
            Score: ${(cb.score ?? 0).toFixed(4)}<br>
            Verdict: ${cb.verdict || "Unknown"}<br>
        </div>

        <button id="close-popup" style="margin-top: 12px; float: right; background: #eee; border: none; padding: 6px 10px; cursor: pointer;">
            Close
        </button>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const toggleBtn = popup.querySelector("#toggle-details");
    const detailsSection = popup.querySelector("#details-section");
    toggleBtn.addEventListener("click", () => {
        const isOpen = detailsSection.style.display === "block";
        detailsSection.style.display = isOpen ? "none" : "block";
        toggleBtn.textContent = isOpen ? "Show Details ▼" : "Hide Details ▲";
    });

    popup.querySelector("#close-popup").addEventListener("click", () => {
        popup.remove();
        overlay.remove();
    });
    overlay.addEventListener("click", () => popup.remove());
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            popup.remove();
            overlay.remove();
        }
    }, { once: true });
}

addFloatingAnalyzeButton();
