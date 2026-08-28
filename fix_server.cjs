const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /app\.post\("\/api\/judicial\/jdg\/auth", async \(req, res\) => \{[\s\S]*?\}\);[\s\S]*?\}\);\s*\}\);\s*/m;

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
        const actualError = data?.error || data?.message || "授權被拒絕或帳號密碼錯誤";
        return res.status(401).json({ error: actualError, message: actualError, raw: data });
      }
    } catch (err) {
      return res.status(500).json({ error: "伺服器連線異常", message: err.message });
    }
  });

`;

// A safer way is to just grab the exact block starting from app.post("/api/judicial/jdg/auth"
// to the next app.post
const newRegex = /app\.post\("\/api\/judicial\/jdg\/auth", async \(req, res\) => \{[\s\S]*?\}\);[\s\S]*?\}\);[\s\S]*?\}\);\s*/;
code = code.replace(newRegex, replacement);

fs.writeFileSync('server.ts', code, 'utf-8');
console.log('Fixed server');
