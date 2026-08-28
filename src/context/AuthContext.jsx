import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { GetMeApi } from "../Api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("funchat_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("funchat_user_token") || null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync / Verify with backend session on load
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem("funchat_user_token");
      if (savedToken) {
        try {
          const res = await GetMeApi();
          if (res?.success && res?.user) {
            setUser(res.user);
            localStorage.setItem("funchat_user", JSON.stringify(res.user));
            if (res.user.username) {
              localStorage.setItem("funchat_profile_name", res.user.username);
              window.dispatchEvent(new Event("profileNameChanged"));
            }
          } else {
            // Token expired or invalid
            logout();
          }
        } catch {
          // Keep offline state
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback((jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("funchat_user_token", jwtToken);
    localStorage.setItem("funchat_user", JSON.stringify(userData));
    if (userData?._id || userData?.id) {
      localStorage.setItem("funchat_user_id", userData._id || userData.id);
    }
    const uname = userData?.username || "Stranger";
    localStorage.setItem("funchat_profile_name", uname);
    window.dispatchEvent(new Event("profileNameChanged"));
    setIsLoginModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("funchat_user_token");
    localStorage.removeItem("funchat_user");
    localStorage.setItem("funchat_profile_name", "Stranger");
    const freshGuestId = "user_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("funchat_user_id", freshGuestId);
    window.dispatchEvent(new Event("profileNameChanged"));
  }, []);

  const updateUser = useCallback((newUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...newUserData };
      localStorage.setItem("funchat_user", JSON.stringify(merged));
      if (merged.username) {
        localStorage.setItem("funchat_profile_name", merged.username);
        window.dispatchEvent(new Event("profileNameChanged"));
      }
      return merged;
    });
  }, []);

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        logout,
        updateUser,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
