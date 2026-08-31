#!/bin/bash
# Add state to LegalGuideHome
sed -i '/const \[copiedDraft, setCopiedDraft\] = useState(false);/a \  const [syllogismAnswers, setSyllogismAnswers] = useState<Record<number, { option: string, text: string }>>({});' src/components/LegalGuideHome.tsx

# Reset state when showing modal
sed -i '/setShowAiTriageModal(true);/a \    setSyllogismAnswers({});' src/components/LegalGuideHome.tsx

