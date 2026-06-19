import { Bot, CalendarRange, LayoutDashboard, MapPinned, UserRound } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import sidebarOfferImage from "../assets/sidebar-offer.jpg";
import { useAuth } from "../context/AuthContext.jsx";

const Sidebar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = [
    { label: "Home", to: "/dashboard", icon: LayoutDashboard },
    { label: "Stations", to: "/stations", icon: MapPinned },
    { label: "Bookings", to: "/bookings", icon: CalendarRange },
    { label: "Assistant", to: "/assistant", icon: Bot },
    { label: "Profile", to: "/profile", icon: UserRound }
  ];

  if (user?.role === "admin") {
    items.push({ label: "Admin", to: "/admin", icon: LayoutDashboard });
  }

  return (
    <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:block">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-blue-900/80 via-violet-800/80 to-amber-400/30 p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Customer Hub</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Discover, book, and charge with confidence.</h2>
      </div>

      <nav className="space-y-2">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-blue-800/80 via-violet-700/80 to-amber-400/50 text-white shadow-lg shadow-violet-900/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 space-y-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-amber-300/15 bg-gradient-to-br from-blue-950/90 via-violet-900/70 to-amber-400/20">
          <img
            src={sidebarOfferImage}
            alt="Modern EV charging station"
            className="h-36 w-full object-cover"
          />
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-[0.35em] text-amber-300/80">Featured Offer</p>
            <h3 className="mt-2 text-lg font-semibold text-white">ChargeOps Prime</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Get priority booking access and premium station recommendations.</p>
            <button
              type="button"
              onClick={() => navigate("/plans")}
              className="mt-4 w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Explore Plan
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-amber-300/80">Shop Add-On</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Home Charger Kit</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Smart home charging hardware with app-ready energy insights.</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-base font-semibold text-white">$499</span>
            <button
              type="button"
              onClick={() => navigate("/plans")}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-300/40 hover:text-white"
            >
              View
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
