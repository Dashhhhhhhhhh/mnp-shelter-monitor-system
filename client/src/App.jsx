import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";

import StaffLogin from "./features/auth/pages/StaffLogin.jsx";

import StaffDashboard from "./features/dashboard/pages/StaffDashboard";

import StaffLayout from "./layouts/StaffLayout";

import AnimalsPage from "./features/animals/pages/AnimalsPage";

import CagesPage from "./features/cages/pages/CagesPage";

import CarePage from "./features/care/pages/CarePage.jsx";

import MedicalPage from "./features/medical/pages/MedicalPage";

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

        <Route path="animals" element={<AnimalsPage />} />

        <Route
          path="/staff/cages"
          element={
            <ProtectedRoute>
              <CagesPage />
            </ProtectedRoute>
          }
        />
        <Route path="care" element={<CarePage />} />

        <Route path="medical" element={<MedicalPage />} />
      </Route>
    </Routes>
  );
}

export default App;
