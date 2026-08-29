const TAIWAN_CASE_TYPE = '[台臺訴上抗簡刑民行家商勞重侵聲再交智金原易補]';

export function normalizeTaiwanCaseQuery(input: string): string {
  let clean = input.trim();
  if (clean.includes('judgment.judicial.gov.tw') || clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      const id = url.searchParams.get('id') ?? url.searchParams.get('jrecno') ?? url.searchParams.get('kw');
      if (id) clean = id;
    } catch {
      return clean;
    }
  }

  if (clean.includes(',')) {
    const parts = clean.split(',').map((part) => part.trim());
    if (/^\d{2,3}$/.test(parts[0]) && parts.length >= 3 && parts[1].includes('台')) {
      return `${parts[0]} ${parts[1]} ${parts[2]}`;
    }
    if (parts.length >= 4 && /^\d{2,3}$/.test(parts[1]) && parts[2].includes('台')) {
      return `${parts[1]} ${parts[2]} ${parts[3]}`;
    }
    return clean;
  }

  const match = clean.match(new RegExp(`^(?:[\\u4e00-\\u9fff]+法院?\\s*)?(\\d{2,3})\\s*(?:年度|年)\\s*(${TAIWAN_CASE_TYPE}[\\u4e00-\\u9fff]{0,6})\\s*(?:字第|第|字)\\s*(\\d+)\\s*號?$`));
  return match ? `${match[1]} ${match[2].replace(/字$/, '')} ${match[3]}` : clean;
}
