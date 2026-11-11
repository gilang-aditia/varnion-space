import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DriveNode } from '@/types/drive'
import { authActions } from './authSlice'

/** Cache node (workspace, folder, file) dari API. */
export interface DriveState {
  nodes: Record<string, DriveNode>
}

const initialState: DriveState = { nodes: {} }

const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    received(state, action: PayloadAction<DriveNode[]>) {
      state.nodes = Object.fromEntries(action.payload.map((n) => [n.id, n]))
    },
    upserted(state, action: PayloadAction<DriveNode | DriveNode[]>) {
      const list = Array.isArray(action.payload) ? action.payload : [action.payload]
      for (const n of list) state.nodes[n.id] = n
    },
    removed(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) delete state.nodes[id]
    },
    /** Pembaruan optimistis "terakhir dibuka" (server juga mencatatnya). */
    opened(state, action: PayloadAction<{ id: string; by: string; at: string }>) {
      const n = state.nodes[action.payload.id]
      if (!n) return
      n.lastOpenedBy = action.payload.by
      n.lastOpenedAt = action.payload.at
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authActions.loggedOut, () => initialState)
  },
})

export const driveActions = driveSlice.actions
export default driveSlice.reducer
