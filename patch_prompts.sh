#!/bin/bash
# Patch toolbox-prompts.ts
sed -i 's/7. CRIMINAL_COMPLAINT_PRIVACY（妨害秘密\/未經同意散布性影像刑事告訴狀）：符合刑法第315條之1（妨害秘密）、第319條之3（散布性私密影像罪，非告訴乃論重罪）。載明竊錄、偷窺或無故散布之管道、檔案與截圖事證。/7. CRIMINAL_COMPLAINT_PRIVACY（妨害秘密\/未經同意散布性影像刑事告訴狀）：符合刑法第315條之1（妨害秘密）、第319條之1至之4（妨害性隱私及不實性影像罪章，包含未經同意攝錄、散布性影像、深度偽造性影像等，非告訴乃論重罪）、性侵害犯罪防治法與兒少性剝削防制條例。載明案發時間地點、影像流傳平台與網址、證據截圖，並提醒當事人得至「衛福部性影像處理中心（siarc.mohw.gov.tw）」申訴請求平台下架。/g' src/prompts/toolbox-prompts.ts

# Update syllogism missing questions structure in server.ts
sed -i 's/"missingQuestions": \[{"question": "若不完整，需補充的問題", "reason": "法條要件理由"}\]/"missingQuestions": \[{"question": "若不完整，需補充的問題", "reason": "法條要件理由", "options": ["常見情境A", "常見情境B", "常見情境C"]}\]/g' server.ts

# Update syllogism missing questions prompt in server.ts
sed -i 's/3. 如果使用者提供的資訊過於模糊、殘缺（例如僅說「我被性交」、「他欠我錢」），請將 `isSyllogismComplete` 設為 false，並在 `missingQuestions` 中列出需要釐清的關鍵事實與理由。/3. 如果使用者提供的資訊過於模糊、殘缺（例如僅說「我被性交」、「他欠我錢」），請將 `isSyllogismComplete` 設為 false，並在 `missingQuestions` 中列出需要釐清的關鍵事實與理由。每個問題必須提供 `options` 陣列（至少提供 2 到 3 個符合實務常見情境的具體選項供使用者點選）。/g' server.ts

# Update syllogism missing questions prompt in src/prompts/toolbox-prompts.ts
sed -i 's/3. ⚠️ 如果使用者提供的資訊過於模糊、殘缺（例如僅說「我被性交」、「他欠我錢」），\*\*絕對不要\*\*直接腦補或盲目生成完整的起訴狀！/3. ⚠️ 如果使用者提供的資訊過於模糊、殘缺（例如僅說「我被性交」、「他欠我錢」），\*\*絕對不要\*\*直接腦補或盲目生成完整的起訴狀！請將 isSyllogismComplete 設為 false，並在 missingQuestions 陣列中列出需要釐清的關鍵事實、理由，並提供 `options` 陣列包含至少2至3個常見情境選項。/g' src/prompts/toolbox-prompts.ts

