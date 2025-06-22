const BACKEND_URL = "http://127.0.0.1:5000/analyze";

// Label insertion beside tweet
function insertIndicator(tweetElement, result) {
    if (tweetElement.querySelector(".misinfo-indicator")) return;

    const indicator = document.createElement("span");
    indicator.className = "misinfo-indicator";
    indicator.style.marginLeft = "8px";
    indicator.style.padding = "2px 6px";
    indicator.style.borderRadius = "8px";
    indicator.style.fontSize = "12px";
    indicator.style.color = "white";
    indicator.style.fontWeight = "bold";

    if (result === "misinformation") {
        indicator.textContent = "MISINFO ❌";
        indicator.style.backgroundColor = "red";
    } else if (result === "factual") {
        indicator.textContent = "FACT ✅";
        indicator.style.backgroundColor = "green";
    } else {
        indicator.textContent = "OPINION ⚠️";
        indicator.style.backgroundColor = "orange";
    }

    tweetElement.appendChild(indicator);
}

function insertAnalyzingIndicator(tweetElement) {
    // Avoid duplicates
    if (tweetElement.querySelector(".misinfo-indicator")) return;

    const indicator = document.createElement("span");
    indicator.className = "misinfo-indicator";
    indicator.style.marginLeft = "8px";
    indicator.style.padding = "2px 6px";
    indicator.style.borderRadius = "8px";
    indicator.style.fontSize = "12px";
    indicator.style.color = "white";
    indicator.style.fontWeight = "bold";
    indicator.style.backgroundColor = "gray";
    indicator.style.verticalAlign = "middle";
    indicator.textContent = "🔄 Analyzing...";

    tweetElement.appendChild(indicator);
}

// Analyze and label tweet
async function analyzeTweet(tweetText, tweetElement) {
    try {
        const cacheKey = `misinfo_${tweetText}`;
        const cached = await chrome.storage.local.get([cacheKey]);

        if (cached[cacheKey]) {
            insertIndicator(tweetElement, cached[cacheKey]);
            return;
        }

        // 🔄 Show temporary "Analyzing..." label
        insertAnalyzingIndicator(tweetElement);

        // Fetch result from backend
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: tweetText })
        });

        const data = await response.json();
        const label = data.classification?.labels?.[0] || "unknown";

        // Clear "Analyzing..." and replace with actual label
        const existing = tweetElement.querySelector(".misinfo-indicator");
        if (existing) existing.remove();

        await chrome.storage.local.set({ [cacheKey]: label });
        insertIndicator(tweetElement, label);
    } catch (err) {
        console.error("Error analyzing tweet:", err);
    }
}

// Detect new tweets
function processTweetElement(tweet) {
    if (tweet.dataset.misinfoAnalyzed) return;
    const tweetTextElement = tweet.querySelector("div[lang]");
    if (tweetTextElement) {
        const tweetText = tweetTextElement.textContent.trim();
        if (tweetText.length > 0) {
            tweet.dataset.misinfoAnalyzed = "true";
            analyzeTweet(tweetText, tweetTextElement.parentElement);
        }
    }
}

// Mutation observer to detect new tweets
function setupObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === "ARTICLE") {
                        processTweetElement(node);
                    } else {
                        node.querySelectorAll("article").forEach(article => {
                            processTweetElement(article);
                        });
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Floating button setup
function createFloatingAnalyzeButton() {
    const button = document.createElement("button");
    button.textContent = " Analyze Tweet";
    Object.assign(button.style, {
        position: "fixed",
        bottom: "100px",
        right: "20px",
        zIndex: "9999",
        padding: "10px 15px",
        backgroundColor: "#1DA1F2",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
    });

    button.addEventListener("click", () => {
        const tweetElement = document.querySelector("article div[lang]");
        if (!tweetElement) return alert("No visible tweet to analyze.");

        const tweetText = tweetElement.textContent.trim();
        if (!tweetText) return alert("Tweet text is empty.");

        fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: tweetText })
        })
        .then(res => res.json())
        .then(data => {
            let message = ` Hugging Face Classification:\n`;
            if (data.classification?.labels?.length) {
                data.classification.labels.forEach((label, i) => {
                    const score = (data.classification.scores[i] * 100).toFixed(2);
                    message += ` - ${label}: ${score}%\n`;
                });
            } else {
                message += " - No result\n";
            }

            message += `\n Google Fact Check:\n`;
            if (data.google_fact_check?.claims?.length) {
                data.google_fact_check.claims.forEach((claim, i) => {
                    message += ` - Claim: ${claim.text || "No text"}\n`;
                    const review = claim.claimReview?.[0];
                    if (review) {
                        message += `   Rating: ${review.textualRating || "N/A"}\n`;
                        message += `   Publisher: ${review.publisher?.name || "Unknown"}\n`;
                    }
                });
            } else {
                message += " - No claims found.\n";
            }

            message += `\n ClaimBuster:\n`;
            if (data.claimbuster?.score !== undefined) {
                message += ` - Score: ${(data.claimbuster.score * 100).toFixed(2)}%\n`;
                message += ` - Verdict: ${data.claimbuster.verdict || "Unknown"}\n`;
            } else {
                message += " - No result or API failed.\n";
            }

            alert(message);
        })
        .catch(err => {
            console.error("Error analyzing tweet:", err);
            alert("❌ Error analyzing tweet.");
        });
    });

    document.body.appendChild(button);
}

// Launch everything
setupObserver();
if (!window.misinfoButtonAdded) {
    createFloatingAnalyzeButton();
    window.misinfoButtonAdded = true;
}
