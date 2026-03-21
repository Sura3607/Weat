import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/useGeolocation";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, Navigation, Search, Star } from "lucide-react";
import { useEffect, useState } from "react";

export default function VenuesPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { latitude, longitude, requestLocation, loading: geoLoading } = useGeolocation();
  const [searchQuery, setSearchQuery] = useState<string>("");

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

        {venues && venues.length > 0 && (
          <div className="space-y-3">
            {venues.map((venue) => (
              <Card key={venue.placeId} className="p-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-terracotta" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{venue.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{venue.address}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {venue.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-ochre fill-ochre" />
                          <span className="text-xs font-medium">{venue.rating}</span>
                          {venue.totalRatings && (
                            <span className="text-xs text-muted-foreground">({venue.totalRatings})</span>
                          )}
                        </div>
                      )}
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
