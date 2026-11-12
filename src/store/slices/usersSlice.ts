import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/drive'
import { loggedOut } from '@/features/login/redux/loginAction'

/** Cache profil pengguna dari API. */
export interface UsersState {
  byId: Record<string, User>
}

const initialState: UsersState = { byId: {} }

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    received(state, action: PayloadAction<User[]>) {
      state.byId = Object.fromEntries(action.payload.map((u) => [u.id, u]))
    },
    upserted(state, action: PayloadAction<User>) {
      state.byId[action.payload.id] = action.payload
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialState)
  },
})

export const usersActions = usersSlice.actions
export default usersSlice.reducer
