import { configureStore, type ThunkAction, type UnknownAction } from "@reduxjs/toolkit";
import { clearAuthTokens, getAuthTokens, setRefreshHandler } from "@/api";
import { isTokenExpired } from "@/lib/jwt";
import loginReducer, { loginStateFromSession } from "@/features/login/redux/loginSlice";
import meReducer from "@/features/me/redux/meSlice";
import logoutReducer from "@/features/logout/redux/logoutSlice";
import refreshTokenReducer from "@/features/refreshToken/redux/refreshTokenSlice";
import { refreshAccessToken } from "@/features/refreshToken/redux/refreshTokenAction";
import userReducer from "@/features/userManagement/redux/userSlice";
import createUserReducer from "@/features/userManagement/redux/createUserSlice";
import userDetailReducer from "@/features/userManagement/redux/userDetailSlice";
import updateUserReducer from "@/features/userManagement/redux/updateUserSlice";
import deleteUserReducer from "@/features/userManagement/redux/deleteUserSlice";
import restoreUserReducer from "@/features/userManagement/redux/restoreUserSlice";
import roleReducer from "@/features/userManagement/redux/roleSlice";
import workspaceListReducer from "@/features/workspace/redux/workspaceSlice";
import createWorkspaceReducer from "@/features/workspace/redux/createWorkspaceSlice";
import workspaceDetailReducer from "@/features/workspace/redux/workspaceDetailSlice";
import workspaceLogsReducer from "@/features/workspace/redux/workspaceLogsSlice";
import updateWorkspaceReducer from "@/features/workspace/redux/updateWorkspaceSlice";
import deleteWorkspaceReducer from "@/features/workspace/redux/deleteWorkspaceSlice";
import restoreWorkspaceReducer from "@/features/workspace/redux/restoreWorkspaceSlice";
import permissionReducer from "@/features/userManagement/redux/permissionSlice";
import usersCacheReducer from "./slices/usersSlice";
import driveReducer from "./slices/driveSlice";
import activityReducer from "./slices/activitySlice";
import uiReducer, { type UiState } from "./slices/uiSlice";
import { loadPrefs, loadSession, savePrefs, saveSession } from "./storage";

/* ------------------------------ preload state ----------------------------- */

/** Sesi dipulihkan hanya bila token masih ada & (access atau refresh token) belum kedaluwarsa. */
function initialSession() {
  const stored = loadSession();
  const tokens = getAuthTokens();
  const usable = !!tokens && (!isTokenExpired(tokens.accessToken, 0) || !isTokenExpired(tokens.refreshToken, 0));
  if (stored && usable) return stored;
  if (tokens) clearAuthTokens();
  if (stored) saveSession(null);
  return null;
}

const session = initialSession();
const prefs = loadPrefs();

/* ---------------------------------- store --------------------------------- */

const store = configureStore({
  reducer: {
    // Modul (src/features/<modul>/redux)
    auth: loginReducer,
    me: meReducer,
    logout: logoutReducer,
    refreshToken: refreshTokenReducer,
    userList: userReducer,
    createUser: createUserReducer,
    userDetail: userDetailReducer,
    updateUser: updateUserReducer,
    deleteUser: deleteUserReducer,
    restoreUser: restoreUserReducer,
    roles: roleReducer,
    permissions: permissionReducer,
    workspaceList: workspaceListReducer,
    createWorkspace: createWorkspaceReducer,
    workspaceDetail: workspaceDetailReducer,
    workspaceLogs: workspaceLogsReducer,
    updateWorkspace: updateWorkspaceReducer,
    deleteWorkspace: deleteWorkspaceReducer,
    restoreWorkspace: restoreWorkspaceReducer,

    // Belum diintegrasikan ke API (src/store/slices)
    users: usersCacheReducer,
    drive: driveReducer,
    activity: activityReducer,
    ui: uiReducer,
  },
  preloadedState: {
    // Sesi tersimpan dipulihkan lewat `restoreSession()` saat aplikasi dibuka.
    auth: loginStateFromSession(session),
    ui: {
      ...uiReducer(undefined, { type: "@@init" }),
      viewMode: prefs.viewMode ?? "grid",
      theme: prefs.theme ?? "system",
      detailsOpen: prefs.detailsOpen ?? false,
    } satisfies UiState,
  },
});

/* ------------------------------ refresh token ----------------------------- */

// http client memanggil ini saat access token kedaluwarsa / dibalas 401
setRefreshHandler(async () => refreshAccessToken.fulfilled.match(await store.dispatch(refreshAccessToken())));

/* ------------------------------ persistence ------------------------------ */

let prev = store.getState();
store.subscribe(() => {
  const next = store.getState();
  if (next.auth.session !== prev.auth.session) saveSession(next.auth.session);
  if (
    next.ui.viewMode !== prev.ui.viewMode ||
    next.ui.theme !== prev.ui.theme ||
    next.ui.detailsOpen !== prev.ui.detailsOpen
  ) {
    savePrefs({ viewMode: next.ui.viewMode, theme: next.ui.theme, detailsOpen: next.ui.detailsOpen });
  }
  prev = next;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type AppThunk<R = void> = ThunkAction<R, RootState, undefined, UnknownAction>;

export { store };
export default store;
