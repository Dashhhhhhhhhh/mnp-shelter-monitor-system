import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";

import apiClient from "../../../../src/api/apiClient";

function StaffLogin() {
  const navigate = useNavigate();

  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      navigate("/staff/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to login. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (user) {
    return <Navigate to="/staff/dashboard" replace />;
  }
  
  return (
    <main>
      <section>
        <h1>M & P Shelter</h1>
        <p>Staff Portal</p>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default StaffLogin;
