import { api, API_PREFIX } from "../../../shared/api/api";
import type { AuthenticatedUser } from "../../auth/api/auth.api";

export interface UserProfile extends AuthenticatedUser {
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  data: UserProfile;
}

export interface UpdateUserProfilePayload {
  name?: string;
  phoneNumber?: string | null;
  image?: string | null;
}

export const getMyProfile = () =>
  api.get<UserProfileResponse>(`${API_PREFIX}/me`);

export const updateMyProfile = (payload: UpdateUserProfilePayload) =>
  api.patch<UserProfileResponse>(`${API_PREFIX}/me`, payload);

