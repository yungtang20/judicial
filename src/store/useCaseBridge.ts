import { create } from 'zustand'

interface CaseBridge {
  facts: string
  suggestedToolId?: string
  triageSummary?: string
  setFromTriage: (payload: {
    facts: string
    suggestedToolId?: string
    triageSummary?: string
  }) => void
  clear: () => void
}

export const useCaseBridge = create<CaseBridge>((set) => ({
  facts: '',
  suggestedToolId: undefined,
  triageSummary: undefined,
  setFromTriage: (payload) => set(payload),
  clear: () => set({ facts: '', suggestedToolId: undefined, triageSummary: undefined }),
}))
