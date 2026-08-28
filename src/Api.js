import baseApi from "./config/axios.js";

// ==========================================
// Settings & Feature Control API
// ==========================================

export const GetSettingApi = async () => {
  try {
    const { data } = await baseApi.get("/api/public/settings");
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch settings",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const GetFeatureControlApi = async () => {
  try {
    const { data } = await baseApi.get("/api/public/feature-control");
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch feature control",
      errors: error?.response?.data?.errors || {},
    };
  }
};

// ==========================================
// CMS Pages API
// ==========================================

export const GetCMSApi = async (params) => {
  try {
    const { data } = await baseApi.get("/api/public/cms", { params });
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch CMS pages",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const OneCMSApi = async (identifier) => {
  try {
    const { data } = await baseApi.get(`/api/public/cms/${identifier}`);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch page",
      errors: error?.response?.data?.errors || {},
    };
  }
};

// ==========================================
// Community API
// ==========================================

export const GetCommunityApi = async (params) => {
  try {
    const { data } = await baseApi.get("/api/public/community", { params });
    return data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error?.response?.data?.message || "Failed to fetch communities",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const UploadCommunityImageApi = async (formData) => {
  try {
    const { data } = await baseApi.post("/api/public/community/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: error?.response?.status,
      message: error?.response?.data?.message || "Failed to upload image",
    };
  }
};

export const GetCommunityMediaSettingsApi = async () => {
  try {
    const { data } = await baseApi.get("/api/public/settings/community-media");
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch community media settings",
    };
  }
};

// ==========================================
// Advertisements API
// ==========================================

export const GetAdvertisementApi = async (params) => {
  try {
    const { data } = await baseApi.get("/api/public/ads", { params });
    return data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error?.response?.data?.message || "Failed to fetch advertisements",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const RecordAdImpressionApi = async (id) => {
  try {
    const { data } = await baseApi.post(`/api/public/ads/${id}/impression`);
    return data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error?.response?.data?.message || "Failed to record impression",
    };
  }
};

export const RecordAdClickApi = async (id) => {
  try {
    const { data } = await baseApi.post(`/api/public/ads/${id}/click`);
    return data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error?.response?.data?.message || "Failed to record click",
    };
  }
};

// ==========================================
// User Authentication (OTP) API
// ==========================================

export const CheckUsernameApi = async (params) => {
  try {
    const { data } = await baseApi.get("/api/public/auth/check-username", { params });
    return data;
  } catch (error) {
    return {
      success: false,
      available: false,
      message: error?.response?.data?.message || "Failed to check username",
      suggestions: error?.response?.data?.suggestions || [],
    };
  }
};

export const SaveUsernameApi = async (payload) => {
  try {
    const { data } = await baseApi.post("/api/public/auth/save-username", payload);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to save username",
      suggestions: error?.response?.data?.suggestions || [],
    };
  }
};

export const SendOtpApi = async (payload) => {
  try {
    const { data } = await baseApi.post("/api/public/auth/send-otp", payload);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to send OTP",
      errors: error?.response?.data?.errors || {},
      suggestions: error?.response?.data?.suggestions || [],
    };
  }
};

export const VerifyOtpApi = async (payload) => {
  try {
    const { data } = await baseApi.post("/api/public/auth/verify-otp", payload);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Verification failed",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const GetMeApi = async () => {
  try {
    const { data } = await baseApi.get("/api/public/auth/me");
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to fetch user session",
    };
  }
};

export const GoogleLoginApi = async (payload) => {
  try {
    const { data } = await baseApi.post("/api/public/auth/google", payload);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Google sign-in failed",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export const UpdateProfileApi = async (payload) => {
  try {
    const { data } = await baseApi.put("/api/public/auth/profile", payload);
    return data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Failed to update profile",
      errors: error?.response?.data?.errors || {},
    };
  }
};

export default {
  GetSettingApi,
  GetFeatureControlApi,
  GetCMSApi,
  OneCMSApi,
  GetCommunityApi,
  GetAdvertisementApi,
  RecordAdImpressionApi,
  RecordAdClickApi,
  CheckUsernameApi,
  SaveUsernameApi,
  SendOtpApi,
  VerifyOtpApi,
  GoogleLoginApi,
  GetMeApi,
  UpdateProfileApi,
};

