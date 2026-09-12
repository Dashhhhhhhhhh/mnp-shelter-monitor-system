import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";

import StaffLogin from "./features/auth/pages/StaffLogin.jsx";

import StaffDashboard from "./features/dashboard/pages/StaffDashboard";

import StaffLayout from "./layouts/StaffLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>M & P Shelter</h1>} />

      <Route path="/staff/login" element={<StaffLogin />} />

      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StaffDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
