export type OfficialEvidenceStatus = "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE";
export type OfficialCitationType = "STATUTE" | "PRECEDENT";
export interface OfficialCitationInput { citation: string; type: OfficialCitationType; }
export interface OfficialEvidence { citation:string; type:OfficialCitationType; status:OfficialEvidenceStatus; source:string; sourceUrl:string; checkedAt:string; query:string; matchStrategy:string; contentHash?:string; snippet?:string; error?:string; }
export interface OfficialVerificationSummary { evidence:OfficialEvidence[]; allVerified:boolean; attempted:boolean; reason?:string; }

const LAW_SEARCH = "https://law.moj.gov.tw/LawClass/LawSearch.aspx";
const JUDGMENT_SEARCH = "https://judgment.judicial.gov.tw/LAW_Mobile_FJUD/FJUD/data.aspx";
const normalize = (v:string) => v.replace(/[\s　]/g, "").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0)-0xfee0));
const hash = async (value:string) => {
  try { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
  catch { return undefined; }
};

export async function verifyOfficialCitations(inputs: (OfficialCitationInput|string)[], options:{fetchImpl?:typeof fetch; timeoutMs?:number}={}):Promise<OfficialVerificationSummary> {
  const typed = inputs.map(item => typeof item === "string" ? { citation:item, type:"STATUTE" as const } : item).filter(i=>i.citation?.trim());
  const unique = Array.from(new Map(typed.map(i=>[`${i.type}:${i.citation.trim()}`, {...i,citation:i.citation.trim()}])).values());
  if (unique.length === 0) return { evidence:[], allVerified:false, attempted:false, reason:"NO_CITATIONS" };
  if (process.env.NODE_ENV === "test" && !options.fetchImpl) return { evidence:[], allVerified:false, attempted:false, reason:"TEST_NETWORK_DISABLED" };
  const fn = options.fetchImpl || fetch; const timeout = options.timeoutMs ?? 5000; const evidence:OfficialEvidence[] = [];
  for (const item of unique) {
    const checkedAt = new Date().toISOString(); const isPrecedent = item.type === "PRECEDENT";
    const source = isPrecedent ? "司法院裁判書系統" : "全國法規資料庫";
    const sourceUrl = `${isPrecedent ? JUDGMENT_SEARCH : LAW_SEARCH}?kw=${encodeURIComponent(item.citation)}`;
    const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(), timeout);
    try {
      const response = await fn(sourceUrl, {signal:controller.signal, headers:{Accept:"text/html"}});
      const body = (await response.text()).replace(/<[^>]+>/g," ").replace(/\s+/g," ");
      const nBody = normalize(body); const nCitation = normalize(item.citation);
      const exact = isPrecedent ? nBody.includes(nCitation) : nBody.includes(nCitation) && !/查無|無符合|沒有符合/.test(nBody);
      const status:OfficialEvidenceStatus = !response.ok ? "UNAVAILABLE" : exact ? "VERIFIED" : "NOT_FOUND";
      evidence.push({citation:item.citation,type:item.type,status,source,sourceUrl,checkedAt,query:item.citation,matchStrategy:isPrecedent?"EXACT_CASE_NUMBER":"EXACT_STATUTE_AND_ARTICLE",contentHash:status === "VERIFIED" ? await hash(body) : undefined,snippet:status === "VERIFIED" ? body.slice(0,240) : undefined,error:response.ok?undefined:`HTTP_${response.status}`});
    } catch (error:any) { evidence.push({citation:item.citation,type:item.type,status:"UNAVAILABLE",source,sourceUrl,checkedAt,query:item.citation,matchStrategy:isPrecedent?"EXACT_CASE_NUMBER":"EXACT_STATUTE_AND_ARTICLE",error:error?.name === "AbortError" ? "TIMEOUT" : "FETCH_FAILED"}); }
    finally { clearTimeout(timer); }
  }
  return {evidence, allVerified:evidence.length === unique.length && evidence.every(e=>e.status === "VERIFIED"), attempted:true};
}
