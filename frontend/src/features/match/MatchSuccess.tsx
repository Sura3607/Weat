'use client';

import { useState, useEffect } from 'react';
import api from '@/shared/api/client';

interface Restaurant {
  name: string;
  address: string;
  distanceM: number;
  rating: number | null;
  mapsUrl: string;
}

interface RestaurantResponse {
  items: Restaurant[];
}

interface MatchSuccessProps {
  matchId: string;
  dishName: string;
  onClose: () => void;
}

export function MatchSuccess({ matchId, dishName, onClose }: MatchSuccessProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  // Show firework animation first, then content
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch restaurant suggestions
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const data = await api.get<RestaurantResponse>(
          `/matches/${matchId}/restaurant-suggestions`,
        );
        setRestaurants(data.items);
      } catch {
        // Use empty list on error
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurants();
  }, [matchId]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Firework particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-firework"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 40}%`,
              backgroundColor: ['#f97066', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][
                i % 5
              ],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Match text */}
      <div className="text-center z-10">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-wider">
          MATCH!
        </h1>
        <p className="text-white/80 text-sm mb-8">
          Cùng nhau đi ăn <span className="text-yellow-400 font-semibold">{dishName}</span>!
        </p>

        {/* Restaurant suggestions */}
        {showContent && (
          <div className="animate-fade-in mx-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-white/10 rounded-xl" />
                ))}
              </div>
            ) : restaurants.length > 0 ? (
              <div className="space-y-3">
                <p className="text-white/60 text-xs mb-3">Gợi ý quán cho bạn:</p>
                {restaurants.map((r, i) => (
                  <a
                    key={i}
                    href={r.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/10 rounded-xl p-3 text-left hover:bg-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.name}</p>
                        <p className="text-white/50 text-xs mt-0.5 truncate">
                          {r.address}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {r.distanceM}m
                          {r.rating && ` | ★ ${r.rating}`}
                        </p>
                      </div>
                      <span className="text-2xl ml-2">🗺️</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}

            {/* Close button */}
            <button
              onClick={onClose}
              className="mt-6 w-full bg-red-500 py-4 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
            >
              Dẫn đường (Google Maps) 🗺️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
