const fs = require('fs');
let code = fs.readFileSync('src/components/LegalToolbox.tsx', 'utf-8');
let matchCount = 0;
code = code.replace(/<label className="([^"]+)">([^<]+)<\/label>\s*(?:<div[^>]*>\s*)?<(input|textarea)[\s\S]*?onChange=\{\(e\) => handleInputChange\('([^']+)'/g, (match, cls, labelText, tag, fieldKey) => {
    matchCount++;
    return match; // noop
});
console.log("Matched: " + matchCount);
