import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type {
  ApiPermissionListResponse,
  FetchPermissionsParams,
  PermissionData,
} from "./permissionType";

/** Batas `per_page` dari backend. */
const MAX_PER_PAGE = 100;

/** GET /rbac/permissions?page=&per_page=&search= */
export const fetchPermissions = createAsyncThunk<
  ApiPermissionListResponse,
  FetchPermissionsParams,
  { state: RootState; rejectValue: string }
>(
  "permissions/fetchPermissions",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiPermissionListResponse>(
        "/rbac/permissions",
        {
          params: {
            page: params.page,
            per_page: params.per_page,
            search: params.search?.trim() || undefined,
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar izin";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar izin", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // request dengan parameter yang sama masih berjalan (mis. effect StrictMode / klik ganda) → lewati
    condition: (params, { getState }) => {
      const { loading, pendingParamsKey } = getState().permissions;
      return !(loading && pendingParamsKey === JSON.stringify(params));
    },
  },
);

/** Semua izin (mengikuti `has_next`, per_page=100) — sumbu matriks hak akses. */
export const fetchAllPermissions = createAsyncThunk<
  PermissionData[],
  void,
  { state: RootState; rejectValue: string }
>(
  "permissions/fetchAllPermissions",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const all: PermissionData[] = [];
      for (let page = 1; ; page++) {
        const response = await api.get<ApiPermissionListResponse>(
          "/rbac/permissions",
          {
            params: { page, per_page: MAX_PER_PAGE },
          },
        );
        all.push(...(response.data.data ?? []));
        if (!response.data.meta.has_next) return all;
      }
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar izin";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar izin", "error", message);
      return rejectWithValue(message);
    }
  },
  { condition: (_, { getState }) => !getState().permissions.loadingAll },
);
