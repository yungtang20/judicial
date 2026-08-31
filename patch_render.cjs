const fs = require('fs');
let code = fs.readFileSync('src/components/LegalGuideHome.tsx', 'utf8');

const oldUl = `<ul className="space-y-3 mt-2">
                          {aiTriageResult.missingQuestions.map((q: any, i: number) => (
                            <li key={i} className="text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                              <div className="font-bold text-amber-300 mb-1">Q: {q.question}</div>
                              <div className="text-slate-400 mb-2">📝 {q.reason}</div>
                              <textarea
                                placeholder="請在此回答補齊關鍵事實..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white focus:border-indigo-500 outline-none resize-y min-h-[60px]"
                                onChange={(e) => {
                                  const newAnswers = { ...(window as any).__syllogismAnswers };
                                  newAnswers[i] = e.target.value;
                                  (window as any).__syllogismAnswers = newAnswers;
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => {
                              const answers = (window as any).__syllogismAnswers || {};
                              const appended = Object.values(answers).filter(Boolean).join("\\n");
                              if (appended) {
                                setSearchQuery(searchQuery + "\\n補充說明：\\n" + appended);
                                setShowAiTriageModal(false);
                                setTimeout(() => handleRunAiTriage(searchQuery + "\\n補充說明：\\n" + appended), 300);
                              }
                            }}`;

const newUl = `<ul className="space-y-3 mt-2">
                          {aiTriageResult.missingQuestions.map((q: any, i: number) => {
                            const currentAnswer = syllogismAnswers[i] || { option: '', text: '' };
                            return (
                            <li key={i} className="text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                              <div className="font-bold text-amber-300 mb-1">Q: {q.question}</div>
                              <div className="text-slate-400 mb-2">📝 {q.reason}</div>
                              
                              {q.options && q.options.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <label key={optIdx} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                      <input 
                                        type="radio" 
                                        name={\`q-\${i}\`} 
                                        value={opt}
                                        checked={currentAnswer.option === opt}
                                        onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                        className="mt-0.5 accent-indigo-500"
                                      />
                                      <span className="text-slate-300">{opt}</span>
                                    </label>
                                  ))}
                                  <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                    <input 
                                      type="radio" 
                                      name={\`q-\${i}\`} 
                                      value="自行輸入"
                                      checked={currentAnswer.option === '自行輸入'}
                                      onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                      className="mt-0.5 accent-indigo-500"
                                    />
                                    <span className="text-slate-300">其他 (自行輸入)</span>
                                  </label>
                                </div>
                              )}

                              {(!q.options || q.options.length === 0 || currentAnswer.option === '自行輸入') && (
                                <textarea
                                  placeholder="請在此回答補齊關鍵事實..."
                                  value={currentAnswer.text}
                                  onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, text: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white focus:border-indigo-500 outline-none resize-y min-h-[60px]"
                                />
                              )}
                            </li>
                          )})}
                        </ul>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => {
                              const appended = Object.values(syllogismAnswers)
                                .map((ans: any) => {
                                  if (ans.option === '自行輸入' || !ans.option) return ans.text;
                                  return ans.option + (ans.text ? \` (\${ans.text})\` : '');
                                })
                                .filter(Boolean)
                                .join("\\n");

                              if (appended) {
                                setSearchQuery(searchQuery + "\\n補充說明：\\n" + appended);
                                setShowAiTriageModal(false);
                                setTimeout(() => handleRunAiTriage(searchQuery + "\\n補充說明：\\n" + appended), 300);
                              }
                            }}`;

if (code.includes('const answers = (window as any).__syllogismAnswers || {};')) {
  code = code.replace(oldUl, newUl);
  fs.writeFileSync('src/components/LegalGuideHome.tsx', code);
  console.log('Successfully patched LegalGuideHome.tsx');
} else {
  console.log('Could not find the target code to replace.');
}
