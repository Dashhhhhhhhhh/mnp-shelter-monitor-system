import { NavLink, Outlet } from "react-router-dom";

function StaffLayout() {
  return (
    <div>
      <aside>
        <h2>M & P Shelter</h2>
        <nav>
          <NavLink to="/staff/dashboard">Dashboard</NavLink>

          <NavLink to="/staff/animals">Animals</NavLink>

          <NavLink to="/staff/cages">Cages</NavLink>

          <NavLink to="/staff/care">Care</NavLink>

          <NavLink to="/staff/medical">Medical</NavLink>

          <NavLink to="/staff/inventory">Inventory</NavLink>

          <NavLink to="/staff/finance">Finance</NavLink>
        </nav>
      </aside>

      <div>
        <header>
          <p>Staff Portal</p>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StaffLayout;
