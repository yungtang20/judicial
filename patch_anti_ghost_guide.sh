#!/bin/bash
sed -i '/{\/\* 自動生成的專屬訴狀草稿預覽 \*\/}/i \
                {/* Anti-Ghost Verification Badge Bar */}\
                {aiTriageResult.antiGhostVerification && (\
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white space-y-2 mt-4">\
                    <div className="flex items-center justify-between">\
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">\
                        <ShieldCheck className="w-4 h-4" /> 司法院真實性檢驗報告\
                      </span>\
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium">\
                        核實 {aiTriageResult.antiGhostVerification.totalCitationsChecked} 處引述 · 0 處幽靈虛構\
                      </span>\
                    </div>\
                    <div className="flex flex-wrap gap-1.5 pt-1">\
                      {aiTriageResult.antiGhostVerification.verifiedCitations.map((c: any, i: number) => (\
                        <span\
                          key={i}\
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700"\
                          title={c.officialSnippet}\
                        >\
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />\
                          {c.officialTitle}\
                        </span>\
                      ))}\
                    </div>\
                  </div>\
                )}' src/components/LegalGuideHome.tsx
