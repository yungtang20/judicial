#!/bin/bash
sed -i '/pleadingDraft: data.pleadingDraft/a \        isSyllogismComplete: data.isSyllogismComplete !== false,\n        missingQuestions: data.missingQuestions || [],' src/components/LegalGuideHome.tsx
