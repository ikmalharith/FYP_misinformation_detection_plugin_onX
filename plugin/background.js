chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyzePost" && message.content) {
        fetch("http://127.0.0.1:5000/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content: message.content })
        })
        .then(response => response.json())
        .then(data => sendResponse(data))
        .catch(error => sendResponse({ error: error.message }));

        return true; 
    }
});
