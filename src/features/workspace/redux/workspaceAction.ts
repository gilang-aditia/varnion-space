import {
  createAsyncThunk,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiWorkspaceListResponse,
  FetchWorkspacesParams,
} from "./workspaceType";

/** `"all"` / string kosong → tidak dikirim ke backend. */
const filterValue = (value?: string) =>
  value && value !== "all" ? value : undefined;

/** Parameter daftar workspace yang sedang aktif (halaman, filter, tampilan terhapus). */
export const workspaceListParams = (
  state: RootState,
): FetchWorkspacesParams => {
  const { currentPage, limit, search, status, deleted } = state.workspaceList;
  return { page: currentPage, per_page: limit, search, status, deleted };
};

/** Ambil ringkasan maksimal sebanyak ini workspace (batas `per_page` backend). */
const SUMMARY_PER_PAGE = 100;

/**
 * GET /workspaces?page=1&per_page=100 tanpa filter — hanya untuk ringkasan
 * kartu statistik beranda (`summary`); daftar yang sedang tampil tidak diubah.
 */
export const fetchWorkspaceSummary = createAsyncThunk<
  ApiWorkspaceListResponse,
  void,
  { state: RootState; rejectValue: string }
>("workspaces/fetchWorkspaceSummary", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<ApiWorkspaceListResponse>("/workspaces", {
      params: {
        page: 1,
        per_page: SUMMARY_PER_PAGE,
        deleted: false,
        _t: Date.now(),
      },
    });
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError<ApiErrorResponse>;
    // gagal diam-diam: ringkasan bukan data utama
    return rejectWithValue(err.response?.data?.error_message || "");
  }
});

/** true → parameter daftar tanpa filter/pencarian/tampilan terhapus. */
export const isUnfilteredList = ({
  search,
  status,
  deleted,
}: FetchWorkspacesParams) =>
  !search?.trim() && (!status || status === "all") && !deleted;

/**
 * Setelah create/edit/hapus/pulihkan: muat ulang daftar yang sedang tampil,
 * dan bila daftar itu berfilter, perbarui ringkasan beranda secara terpisah.
 */
export const refreshWorkspaceList =
  (): ThunkAction<void, RootState, unknown, UnknownAction> =>
  (dispatch, getState) => {
    const params = workspaceListParams(getState());
    void dispatch(fetchWorkspaces({ ...params, fresh: true }));
    if (!isUnfilteredList(params)) void dispatch(fetchWorkspaceSummary());
  };

/** GET /workspaces?page=&per_page=&search=&status=&deleted= */
export const fetchWorkspaces = createAsyncThunk<
  ApiWorkspaceListResponse,
  FetchWorkspacesParams,
  { state: RootState; rejectValue: string }
>(
  "workspaces/fetchWorkspaces",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiWorkspaceListResponse>("/workspaces", {
        params: {
          page: params.page,
          per_page: params.per_page,
          search: params.search?.trim() || undefined,
          status: filterValue(params.status),
          // selalu dikirim eksplisit: daftar aktif tidak boleh berisi workspace terhapus
          deleted: !!params.deleted,
          _t: params.fresh ? Date.now() : undefined,
        },
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar workspace";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar workspace", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // request dengan parameter yang sama masih berjalan (mis. effect StrictMode) → lewati
    condition: (params, { getState }) => {
      const { loading, pendingParamsKey } = getState().workspaceList;
      return !(loading && pendingParamsKey === JSON.stringify(params));
    },
  },
);
