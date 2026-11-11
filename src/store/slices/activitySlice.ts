import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ActivityLog } from '@/types/drive'
import { loggedOut } from '../auth/authActions'

/** Cache log aktivitas dari API, terurut dari yang terbaru. */
export interface ActivityState {
  logs: ActivityLog[]
}

const MAX_LOGS = 3000
const initialState: ActivityState = { logs: [] }

const newestFirst = (a: ActivityLog, b: ActivityLog) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    received(state, action: PayloadAction<ActivityLog[]>) {
      state.logs = [...action.payload].sort(newestFirst).slice(0, MAX_LOGS)
    },
    /** Gabungkan log baru (hasil sinkronisasi inkremental) tanpa duplikasi. */
    merged(state, action: PayloadAction<ActivityLog[]>) {
      const known = new Set(state.logs.map((l) => l.id))
      const fresh = action.payload.filter((l) => !known.has(l.id))
      if (!fresh.length) return
      state.logs = [...fresh, ...state.logs].sort(newestFirst).slice(0, MAX_LOGS)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState)
  },
})

export const activityActions = activitySlice.actions
export default activitySlice.reducer
