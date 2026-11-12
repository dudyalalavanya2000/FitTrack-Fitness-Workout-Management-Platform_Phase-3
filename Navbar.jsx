
import { LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("fittrack_token");
    localStorage.removeItem("fittrack_user");
    navigate("/login");
  };

  const username = localStorage.getItem("fittrack_user") || "User";

  return (
    <header className="top-navbar">
      <div>
        <p className="welcome-label">WELCOME BACK</p>
        <h3>{username}</h3>
      </div>

      <div className="navbar-actions">
        <div className="profile-info">
          <UserCircle size={23} />
          <span>{username}</span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
