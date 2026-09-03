const express = require("express");
const app = express();
app.use(express.json());

// Mocking the endpoint
app.post("/api/fetch-url", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });
    
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return res.status(400).json({ error: "Only HTTP/HTTPS protocols are allowed" });
    }

    const hostname = urlObj.hostname;
    const isPrivateIp = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)|localhost$/i.test(hostname) || /^\[?[0:]+1\]?$/.test(hostname);
    if (isPrivateIp) {
      return res.status(403).json({ error: "Access to internal networks is forbidden" });
    }
    return res.json({ success: true });
});

const server = app.listen(0, async () => {
    const port = server.address().port;
    const testCases = [
        "http://localhost/admin",
        "http://127.0.0.1:8080",
        "http://169.254.169.254/latest/meta-data/",
        "file:///etc/passwd",
        "http://google.com"
    ];
    for (const test of testCases) {
        const res = await fetch(`http://127.0.0.1:${port}/api/fetch-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: test })
        });
        const body = await res.json();
        console.log(`${test} -> HTTP ${res.status}: ${JSON.stringify(body)}`);
    }
    server.close();
});
