#!/bin/bash
sed -i 's/請將 isSyllogismComplete 設為 false，並在 missingQuestions 陣列中列出需要釐清的關鍵事實、理由，並提供 "options" 陣列包含至少2至3個常見情境選項。/請在回覆中列出需要釐清的關鍵事實、理由，並且每個問題必須提供至少 2 至 3 個符合實務的常見情境選項（例如 a. b. c.）供使用者參考。/g' src/prompts/toolbox-prompts.ts
