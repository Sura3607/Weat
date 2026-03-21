import { Camera, MapPin, Radio, User, Utensils } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

const navItems = [
  { path: "/feed", icon: Utensils, label: "Feed" },
  { path: "/radar", icon: Radio, label: "Radar" },
  { path: "/camera", icon: Camera, label: "Chụp", isCenter: true },
  { path: "/venues", icon: MapPin, label: "Quán ăn" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Hide on camera page, home page, and onboarding page
  if (location === "/camera" || location === "/" || location === "/onboarding") return null;

  /**
   * Invalidate (refetch) data relevant to the target page.
   * Runs on EVERY nav click so the destination always shows fresh data.
   */
  const invalidateForPage = useCallback(
    (path: string) => {
      switch (path) {
        case "/feed":
          utils.foodLog.feed.invalidate();
          break;
        case "/radar":
          utils.radar.nearby.invalidate();
          break;
        case "/profile":
          utils.auth.me.invalidate();
          utils.profile.get.invalidate();
          utils.foodLog.myLogs.invalidate();
          break;
        case "/venues":
          utils.venue.search.invalidate();
          break;
      }
    },
    [utils],
  );

  const handleNavClick = useCallback(
    (path: string) => {
      // Always invalidate so the destination page fetches fresh data
      invalidateForPage(path);

      if (location === path) {
        // Already on this page → scroll to top (pull-to-refresh UX)
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Navigate to the target page programmatically
        setLocation(path);
      }
    },
    [location, setLocation, invalidateForPage],
  );

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] bottom-nav z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className="flex flex-col items-center -mt-6 bg-transparent border-0 p-0 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-terracotta shadow-lg shadow-terracotta/30 flex items-center justify-center ring-4 ring-white">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? "text-terracotta font-semibold" : "text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className="flex flex-col items-center py-2 px-3 bg-transparent border-0 cursor-pointer"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? "text-terracotta" : "text-gray-400"
                }`}
              />
              <span
                className={`text-[11px] mt-1 transition-colors ${
                  isActive ? "text-terracotta font-semibold" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
