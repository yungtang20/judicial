const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /app\.post\("\/api\/judicial\/jdg\/auth", async \(req, res\) => \{[\s\S]*?\}\);/m;

const replacement = `app.post("/api/judicial/jdg/auth", async (req, res) => {
    try {
      const user = req.body.user || process.env.JUDICIAL_OPENDATA_ACCOUNT || "";
      const password = req.body.password || process.env.JUDICIAL_OPENDATA_PASSWORD || "";
      if (!user || !password) {
        return res.status(400).json({ error: "缺少帳號或密碼", message: "缺少帳號或密碼" });
      }
      const response = await fetch("https://data.judicial.gov.tw/jdg/api/Auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      const data = await response.json();
      const token = data?.Token || data?.token;
      if (token) {
        return res.json({ Token: token, token });
      } else {
        // Forward the actual error from Judicial API
        const actualError = data?.error || data?.message || "授權被拒絕或帳號密碼錯誤";
        return res.status(401).json({ error: actualError, message: actualError, raw: data });
      }
    } catch (err) {
      return res.status(500).json({ error: "伺服器連線異常", message: err.message });
    }
  });`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code, 'utf-8');
console.log('Patched auth error');
