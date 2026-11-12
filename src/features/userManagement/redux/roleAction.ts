import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "@/api/axios";
import type { ApiErrorResponse } from "@/types/api";
import type { RootState } from "@/store";
import { endSession, notify } from "@/store/thunks/helpers";
import type { ApiRoleListResponse, FetchRolesParams, Role } from "./roleType";

/** Batas `per_page` dari backend. */
const MAX_PER_PAGE = 100;

/** GET /rbac/roles?page=&per_page=&search= */
export const fetchRoles = createAsyncThunk<
  ApiRoleListResponse,
  FetchRolesParams,
  { state: RootState; rejectValue: string }
>(
  "roles/fetchRoles",
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get<ApiRoleListResponse>("/rbac/roles", {
        params: {
          page: params.page,
          per_page: params.per_page,
          search: params.search?.trim() || undefined,
        },
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar peran";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar peran", "error", message);
      return rejectWithValue(message);
    }
  },
  {
    // request dengan parameter yang sama masih berjalan (mis. effect StrictMode / klik ganda) → lewati
    condition: (params, { getState }) => {
      const { loading, pendingParamsKey } = getState().roles;
      return !(loading && pendingParamsKey === JSON.stringify(params));
    },
  },
);

/** Semua peran (mengikuti `has_next`, per_page=100) — untuk pilihan filter peran. */
export const fetchAllRoles = createAsyncThunk<
  Role[],
  void,
  { state: RootState; rejectValue: string }
>(
  "roles/fetchAllRoles",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const all: Role[] = [];
      for (let page = 1; ; page++) {
        const response = await api.get<ApiRoleListResponse>("/rbac/roles", {
          params: { page, per_page: MAX_PER_PAGE },
        });
        all.push(...(response.data.data ?? []));
        if (!response.data.meta.has_next) return all;
      }
    } catch (error: unknown) {
      const err = error as AxiosError<ApiErrorResponse>;
      const message =
        err.response?.data?.error_message || "Gagal memuat daftar peran";
      if (err.response?.status === 401) endSession(dispatch, message);
      else notify(dispatch, "Gagal memuat daftar peran", "error", message);
      return rejectWithValue(message);
    }
  },
  { condition: (_, { getState }) => !getState().roles.loadingAll },
);
