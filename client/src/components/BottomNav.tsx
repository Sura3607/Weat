import { Camera, MapPin, Radio, User, Utensils } from "lucide-react";
import { useLocation, Link } from "wouter";

const navItems = [
  { path: "/feed", icon: Utensils, label: "Feed" },
  { path: "/radar", icon: Radio, label: "Radar" },
  { path: "/camera", icon: Camera, label: "Chụp", isCenter: true },
  { path: "/venues", icon: MapPin, label: "Quán ăn" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  // Hide on camera page
  if (location === "/camera") return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card/95 backdrop-blur-md border-t border-border bottom-nav z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path}>
                <div className="flex flex-col items-center -mt-5">
                  <div className="w-14 h-14 rounded-full bg-terracotta shadow-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] mt-0.5 text-muted-foreground">{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.path} href={item.path}>
              <div className="flex flex-col items-center py-2 px-3">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-terracotta" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 transition-colors ${
                    isActive ? "text-terracotta font-medium" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
