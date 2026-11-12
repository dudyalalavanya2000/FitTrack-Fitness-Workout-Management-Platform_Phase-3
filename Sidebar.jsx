
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Target,
  ChartNoAxesCombined,
  Bell,
  HeartPulse,
  Apple,
  Droplets,
  Sparkles,
  Timer,
  Smartphone,
  BellRing,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Workouts", path: "/workouts", icon: Dumbbell },
  { name: "Daily Progress", path: "/progress", icon: Activity },
  { name: "Fitness Goals", path: "/goals", icon: Target },
  { name: "Nutrition", path: "/nutrition", icon: Apple },
  { name: "Water Intake", path: "/water", icon: Droplets },
  { name: "AI Workout Suggestions", path: "/ai-workouts", icon: Sparkles },
  { name: "Workout Timer", path: "/workout-timer", icon: Timer },
  {
    name: "Health Integrations",
    path: "/health-integrations",
    icon: Smartphone,
  },
  { name: "Reports", path: "/reports", icon: ChartNoAxesCombined },
  { name: "Reminders", path: "/reminders", icon: BellRing },
  { name: "Notifications", path: "/notifications", icon: Bell },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <HeartPulse size={25} />
        </div>
        <span>FitTrack</span>
      </div>

      <p className="menu-heading">MENU</p>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p>Stay consistent.</p>
        <span>Your fitness journey starts today!</span>
      </div>
    </aside>
  );
}

export default Sidebar;
