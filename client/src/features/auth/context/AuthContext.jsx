import { createContext, useEffect, useState } from "react";

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
} from "../api/authApi";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await getMe();

        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login(credentials) {
    const data = await loginRequest(credentials);

    setUser(data.user);

    return data;
  }

  async function logout() {
    await logoutRequest();

    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
