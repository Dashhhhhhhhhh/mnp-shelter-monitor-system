import { useNavigate } from "react-router-dom";

import { useState } from "react";

import useAuth from "../../auth/hooks/useAuth";

import RegisterStaffModal from "../../users/components/RegisterStaffModal";

function StaffDashboard() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  function handleRegister() {
    setIsRegisterModalOpen(true);
  }

  async function handleLogout() {
    await logout();
    navigate("/staff/login");
  }

  return (
    <main>
      <h1>Staff Dashboard</h1>
      <p>Welcome to the M & P Shelter staff portal.</p>

      <button onClick={handleLogout}>Logout</button>

      {user?.role === "ADMIN" && (
        <button onClick={handleRegister}>Register Staff</button>
      )}

      {isRegisterModalOpen && (
        <RegisterStaffModal onClose={() => setIsRegisterModalOpen(false)} />
      )}
    </main>
  );
}

export default StaffDashboard;
