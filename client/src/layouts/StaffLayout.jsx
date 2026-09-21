import { NavLink, Outlet } from "react-router-dom";

import "./StaffLayout.css";

function StaffLayout() {
  return (
    <div className="staff-layout">
      <aside className="staff-sidebar">
        <h2>M & P Shelter</h2>

        <nav className="staff-nav">
          <NavLink to="/staff/dashboard">Dashboard</NavLink>
          <NavLink to="/staff/animals">Animals</NavLink>
          <NavLink to="/staff/cages">Cages</NavLink>
          <NavLink to="/staff/care">Care</NavLink>
          <NavLink to="/staff/medical">Medical</NavLink>
          <NavLink to="/staff/observations">Observations</NavLink>
          <NavLink to="/staff/inventory">Inventory</NavLink>
          <NavLink to="/staff/finance">Finance</NavLink>
        </nav>
      </aside>

      <div className="staff-main">
        <header className="staff-header">
          <p>Staff Portal</p>
        </header>

        <main className="staff-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StaffLayout;
