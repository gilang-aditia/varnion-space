import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import { clearAuthTokens, setAuthTokens } from "@/api";
import type { ApiErrorResponse } from "@/types/api";
import { describeDevice } from "@/lib/device";
import { mapUser } from "@/lib/user-mapper";
import type { AppDispatch, RootState } from "@/store";
import { usersActions } from "@/store/slices/usersSlice";
import { saveRememberedIdentifier } from "@/store/storage";
import { notify } from "@/store/thunks/helpers";
import { syncRouteFromUrl } from "@/store/thunks/navigation";
import { fetchMe } from "@/features/me/redux/meAction";
import type { ApiMeResponse } from "@/features/me/redux/meType";
import type { ApiLoginResponse, LoginParams, LoginPayload, LoginResult } from "./loginType";

/** Identitas aplikasi & workspace untuk login (lihat .env.example). */
const CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID ?? "web_browser";
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001";

/** Sesi berakhir (logout / token kedaluwarsa). Semua slice mereset datanya. */
export const loggedOut = createAction("auth/loggedOut");

/**
 * Muat data awal setelah login / saat sesi dipulihkan: `GET /auth/me`.
 * (`fetchMe` juga memasukkan profil ke cache `users` untuk nama & avatar.)
 */
async function loadInitialData(dispatch: AppDispatch): Promise<ApiMeResponse> {
  return dispatch(fetchMe({ silent: true })).unwrap();
}

/** POST /auth/login → simpan token (cookie) → muat data awal. */
export const login = createAsyncThunk<LoginResult, LoginParams, { dispatch: AppDispatch; rejectValue: string }>(
  "auth/login",
  async ({ email, password, remember }, { dispatch, rejectWithValue }) => {
    try {
      const payload: LoginPayload = {
        client_id: CLIENT_ID,
        email: email.trim(),
        password,
        remember_me: remember,
        workspace_id: WORKSPACE_ID,
      };
      const response = await api.post<ApiLoginResponse>("/auth/login", payload, { skipRefresh: true });
      const { access_token, refresh_token, user } = response.data.data;

      setAuthTokens({ accessToken: access_token, refreshToken: refresh_token, remember });
      dispatch(usersActions.upserted(mapUser(user)));
      const me = await loadInitialData(dispatch);

      saveRememberedIdentifier(remember ? email.trim() : null);
      window.history.replaceState(null, "", "#/");
      notify(dispatch, "Berhasil masuk", "success", `Selamat datang, ${me.data.display_name}.`);

      return {
        response: response.data,
        session: { userId: user.id, remember, startedAt: new Date().toISOString(), device: describeDevice() },
      };
    } catch (error: unknown) {
      clearAuthTokens();
      // string → pesan dari `fetchMe(...).unwrap()`; selain itu error axios dari /auth/login
      const err = error as AxiosError<ApiErrorResponse> | string;
      const message = (typeof err === "string" ? err : err.response?.data?.error_message) || "Gagal masuk.";
      notify(dispatch, "Gagal masuk", "error", message);
      return rejectWithValue(message);
    }
  },
);

/** Pulihkan sesi tersimpan (token di cookie) saat aplikasi dibuka. 401 → kembali ke login. */
export const restoreSession = createAsyncThunk<
  ApiMeResponse,
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>("auth/restoreSession", async (_, { dispatch, getState, rejectWithValue }) => {
  try {
    const me = await loadInitialData(dispatch);
    // route dari URL diterapkan SEBELUM aplikasi tampil → tidak ada "lompatan" saat reload
    dispatch(syncRouteFromUrl());
    return me;
  } catch (error: unknown) {
    // `fetchMe(...).unwrap()` melempar pesan (string); 401 sudah mengakhiri sesi di `fetchMe`
    const message =
      (typeof error === "string" ? error : (error as AxiosError<ApiErrorResponse>).response?.data?.error_message) ||
      "Gagal memuat sesi.";
    if (getState().auth.session) notify(dispatch, "Gagal memuat sesi", "error", message);
    return rejectWithValue(message);
  }
});
