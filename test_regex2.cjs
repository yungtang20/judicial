const fs = require('fs');
let code = fs.readFileSync('src/components/LegalToolbox.tsx', 'utf-8');
const regex = /<label className="([^"]+)">([^<]+)<\/label>(\s*(?:<div[^>]*>\s*)?<(?:input|textarea)[\s\S]*?onChange=\{\(e\) => handleInputChange\('([^']+)')/g;

let out = code.replace(regex, (match, cls, labelText, rest, fieldKey) => {
    let newCls = cls.replace('mb-1', '').trim();
    return `<div className="flex justify-between items-end mb-1"><label className="${newCls}">${labelText}</label><AiSuggestButton fieldLabel="${labelText}" fieldKey="${fieldKey}" toolName={currentTool?.name || ''} incidentDetails={formInputs.incidentDetails || ''} onSelect={(val) => handleInputChange('${fieldKey}', val)} /></div>` + rest;
});
fs.writeFileSync('src/components/LegalToolbox.tsx.new', out);
console.log("Done");
