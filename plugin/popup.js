const analyzeButton = document.getElementById("analyzeButton");
const resultContainer = document.getElementById("result");

analyzeButton.addEventListener("click", () => {
    const content = document.getElementById("urlInput").value.trim();

    if (!content) {
        resultContainer.textContent = "Please enter tweet text.";
        return;
    }

    chrome.runtime.sendMessage({ action: "analyzePost", content }, (response) => {
        if (response.error) {
            resultContainer.textContent = "Error: " + response.error;
            return;
        }

        const { summary, huggingface, detailed_analysis = [] } = response;

        // Verdict only (visible by default)
        const verdictText = summary?.toUpperCase() || "UNKNOWN";
        const verdictHTML = `<div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Verdict: ${verdictText}</div>`;

        // Hidden detailed section
        let detailHTML = "";

        detailHTML += `<div style="margin-bottom: 10px;"><strong>Hugging Face:</strong><br>`;
        if (huggingface?.labels) {
            huggingface.labels.forEach((label, i) => {
                const score = huggingface.scores?.[i];
				const percent = score !== undefined ? (score * 100).toFixed(1) + "%" : "0.0%";
				detailHTML += `${label}: ${percent}<br>`;
                
            });
        } else {
            detailHTML += "No result<br>";
        }
        detailHTML += `</div>`;

        const first = detailed_analysis[0];
        if (first) {
            const claim = first.google?.[0] || {};
            const cb = first.claimbuster || {};

            detailHTML += `<div style="margin-bottom: 10px;"><strong>Google Fact Check:</strong><br>`;
            //detailHTML += `<em>Claim:</em> ${claim.text || "No claim"}<br>`;
            detailHTML += `<em>Rating:</em> ${claim.rating || "N/A"}<br></div>`;

            detailHTML += `<div style="margin-bottom: 10px;"><strong>ClaimBuster:</strong><br>`;
            const cbPercent = cb.score !== undefined ? (cb.score * 100).toFixed(1) + "%" : "0.0%";
			detailHTML += `Score: ${cbPercent}<br>`;
            detailHTML += `Verdict: ${cb.verdict || "Unknown"}<br></div>`;
        } else {
            detailHTML += `<div>No strong claims found.</div>`;
        }

        // Inject HTML
        resultContainer.innerHTML = `
            <div id="verdictSection">${verdictHTML}</div>
            <button id="toggleDetails" style="margin: 8px 0; padding: 4px 8px;">Show Details ▼</button>
            <div id="detailsSection" style="display: none;">${detailHTML}</div>
        `;

        // Toggle logic
        const toggleBtn = document.getElementById("toggleDetails");
        const detailsDiv = document.getElementById("detailsSection");
        toggleBtn.addEventListener("click", () => {
            const isVisible = detailsDiv.style.display === "block";
            detailsDiv.style.display = isVisible ? "none" : "block";
            toggleBtn.textContent = isVisible ? "Show Details ▼" : "Hide Details ▲";
        });
    });
});
