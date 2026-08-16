import { create } from 'zustand'

interface UiState {
  selectedEntryId: string | null
  entryEditorId: string | 'new' | null
  categoriesOpen: boolean
  changelogOpen: boolean
  setSelectedEntryId: (id: string | null) => void
  openEntryEditor: (id?: string) => void
  closeEntryEditor: () => void
  setCategoriesOpen: (open: boolean) => void
  setChangelogOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedEntryId: null,
  entryEditorId: null,
  categoriesOpen: false,
  changelogOpen: false,
  setSelectedEntryId: (selectedEntryId) => set({ selectedEntryId }),
  openEntryEditor: (id) => set({ entryEditorId: id ?? 'new' }),
  closeEntryEditor: () => set({ entryEditorId: null }),
  setCategoriesOpen: (categoriesOpen) => set({ categoriesOpen }),
  setChangelogOpen: (changelogOpen) => set({ changelogOpen }),
}))
