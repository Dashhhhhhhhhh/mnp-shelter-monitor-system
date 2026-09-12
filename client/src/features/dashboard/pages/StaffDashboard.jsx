import { useNavigate } from "react-router-dom";
import useAuth from "../../auth/hooks/useAuth";

function StaffDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/staff/login");
  }

  return (
    <main>
      <h1>Staff Dashboard</h1>
      <p>Welcome to the M & P Shelter staff portal.</p>

      <button onClick={handleLogout}>Logout</button>
    </main>
  );
}

export default StaffDashboard;
