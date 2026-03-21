import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, Navigation, Search, Star, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

type SortOption = "relevance" | "star-high" | "star-low" | "distance-near" | "distance-far";
type VenueWithDistance = { placeId: string; name: string; address: string; lat: number; lng: number; rating: number | undefined; totalRatings: number | undefined; distance: number };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function VenuesPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { latitude, longitude, requestLocation, loading: geoLoading } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(200);
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const locationReady = latitude !== null && longitude !== null;

  const { data: venues, isLoading } = trpc.venue.search.useQuery(
    { latitude: latitude!, longitude: longitude!, craving: searchQuery || undefined, radius: 500 },
    { enabled: locationReady }
  );

  useEffect(() => {
    requestLocation();
  }, []);

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=walking`;
    window.open(url, "_blank");
  };

  // Apply filters and sorting
  const filteredAndSortedVenues = (() => {
    if (!venues || !latitude || !longitude) return [];

    // Add distance calculations
    const venuesWithDistance: VenueWithDistance[] = venues.map((venue: any) => ({
      ...venue,
      distance: calculateDistance(latitude, longitude, venue.lat, venue.lng),
    }));

    // Apply filters
    let filtered = venuesWithDistance.filter((venue) => {
      // Rating filter
      if (venue.rating && venue.rating < minRating) return false;
      // Distance filter
      if (venue.distance > maxDistance) return false;
      return true;
    });

    // Apply sorting
    switch (sortOption) {
      case "star-high":
        return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "star-low":
        return filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case "distance-near":
        return filtered.sort((a, b) => a.distance - b.distance);
      case "distance-far":
        return filtered.sort((a, b) => b.distance - a.distance);
      case "relevance":
      default:
        return filtered;
    }
  })();

  if (authLoading) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="page-enter pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Quán ăn gợi ý</h1>
        <p className="text-xs text-muted-foreground">Dựa trên vị trí và sở thích của bạn</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo craving... (phở, sushi, pizza)"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="text-sm">Bộ lọc</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
            {/* Sort Option */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sắp xếp</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSortOption("relevance")}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                    sortOption === "relevance"
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  Đang thèm
                </button>
                <button
                  onClick={() => setSortOption("distance-near")}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                    sortOption === "distance-near"
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  Gần nhất
                </button>
                <button
                  onClick={() => setSortOption("distance-far")}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                    sortOption === "distance-far"
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  Xa nhất
                </button>
                <button
                  onClick={() => setSortOption("star-high")}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                    sortOption === "star-high"
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  Sao cao nhất
                </button>
              </div>
            </div>

            {/* Star Rating Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sao tối thiểu: {minRating.toFixed(1)}</label>
              </div>
              <Slider
                value={[minRating]}
                onValueChange={(value) => setMinRating(value[0])}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>5</span>
              </div>
            </div>

            {/* Distance Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Khoảng cách tối đa: {maxDistance}m</label>
              </div>
              <Slider
                value={[maxDistance]}
                onValueChange={(value) => setMaxDistance(value[0])}
                min={0}
                max={500}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0m</span>
                <span>200m</span>
              </div>
            </div>

            {/* Distance Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng cách nhanh chọn</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setMaxDistance(50)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    maxDistance === 50
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  50m
                </button>
                <button
                  onClick={() => setMaxDistance(100)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    maxDistance === 100
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  100m
                </button>
                <button
                  onClick={() => setMaxDistance(200)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    maxDistance === 200
                      ? "bg-terracotta text-white"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  200m
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location status */}
        {geoLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang xác định vị trí...
          </div>
        )}

        {/* Venue list */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {venues && venues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy quán ăn phù hợp</p>
            <p className="text-xs text-muted-foreground mt-1">Thử tìm kiếm với từ khóa khác</p>
          </div>
        )}

        {venues && filteredAndSortedVenues.length === 0 && venues.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy quán ăn phù hợp với bộ lọc</p>
            <p className="text-xs text-muted-foreground mt-1">Thử điều chỉnh lại bộ lọc</p>
          </div>
        )}

        {filteredAndSortedVenues.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground px-1">
              Tìm thấy {filteredAndSortedVenues.length} quán ăn
            </div>
            {filteredAndSortedVenues.map((venue) => (
              <Card key={venue.placeId} className="p-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-terracotta" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{venue.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{venue.address}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {venue.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-ochre fill-ochre" />
                          <span className="text-xs font-medium">{venue.rating}</span>
                          {venue.totalRatings && (
                            <span className="text-xs text-muted-foreground">({venue.totalRatings})</span>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {venue.distance < 1000
                          ? `${Math.round(venue.distance)}m`
                          : `${(venue.distance / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => openInMaps(venue.lat, venue.lng, venue.name)}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
