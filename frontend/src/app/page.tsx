'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/shared/stores/authStore';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { CameraScreen } from '@/features/camera/CameraScreen';
import { FoodFeed } from '@/features/feed/FoodFeed';
import { RadarSheet } from '@/features/radar/RadarSheet';
import { CravingInput } from '@/features/radar/CravingInput';
import { InvitePopup } from '@/features/invite/InvitePopup';
import { MatchSuccess } from '@/features/match/MatchSuccess';
import { connectSocket, disconnectSocket } from '@/shared/lib/realtime';
import { useGeolocation } from '@/shared/hooks/useGeolocation';

export default function HomePage() {
  const { isAuthenticated, token, user, loadFromStorage, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  const [showFeed, setShowFeed] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showCraving, setShowCraving] = useState(false);
  const [activeInvite, setActiveInvite] = useState<{
    inviteId: string;
    fromDisplayName: string;
    dishName: string;
  } | null>(null);
  const [activeMatch, setActiveMatch] = useState<{
    matchId: string;
    dishName: string;
  } | null>(null);

  const { startTracking, stopTracking, isTracking, error: geoError } = useGeolocation();

  // Hydrate auth from localStorage
  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = connectSocket(token);

    // Listen for realtime events
    socket.on('invite.received', (event: { payload: { inviteId: string; fromDisplayName: string; dishName: string } }) => {
      setActiveInvite({
        inviteId: event.payload.inviteId,
        fromDisplayName: event.payload.fromDisplayName,
        dishName: event.payload.dishName,
      });
    });

    socket.on('invite.accepted', (event: { payload: { inviteId: string; matchId: string; dishName: string } }) => {
      // The inviter sees this when their invite is accepted
      setActiveMatch({
        matchId: event.payload.matchId,
        dishName: event.payload.dishName,
      });
    });

    socket.on('match.created', (event: { payload: { matchId: string; dishName: string } }) => {
      setActiveMatch({
        matchId: event.payload.matchId,
        dishName: event.payload.dishName,
      });
    });

    return () => {
      socket.off('invite.received');
      socket.off('invite.accepted');
      socket.off('match.created');
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  // Start geolocation tracking when authenticated
  useEffect(() => {
    if (isAuthenticated && !isTracking) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [isAuthenticated, isTracking, startTracking, stopTracking]);

  // Show loading while hydrating
  if (!hydrated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-500 mb-2">Weat</h1>
          <p className="text-white/40 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="relative h-full w-full">
      {/* Main Camera View */}
      <CameraScreen />

      {/* Top Action Buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
        {/* Radar Button - Top Left */}
        <button
          onClick={() => setShowRadar(true)}
          className="touch-target bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
          aria-label="Mở Radar tìm bạn"
        >
          Radar
        </button>

        {/* User info + Logout */}
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs truncate max-w-[100px]">
            {user?.displayName}
          </span>
          <button
            onClick={logout}
            className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-2 text-xs text-white/60"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="absolute bottom-28 left-4 right-4 flex justify-between z-10">
        {/* Feed Button */}
        <button
          onClick={() => setShowFeed(true)}
          className="touch-target bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
          aria-label="Xem Feed bạn bè"
        >
          Feed
        </button>

        {/* Craving Button */}
        <button
          onClick={() => setShowCraving(true)}
          className="touch-target bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
          aria-label="Nhập món đang thèm"
        >
          Thèm Gì?
        </button>
      </div>

      {/* Geo status indicator */}
      {geoError && (
        <div className="absolute top-16 left-4 right-4 z-10">
          <div className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-2 rounded-lg text-center">
            {geoError}
          </div>
        </div>
      )}

      {/* Food Feed Bottom Sheet */}
      {showFeed && (
        <FoodFeed onClose={() => setShowFeed(false)} />
      )}

      {/* Radar Sheet */}
      {showRadar && (
        <RadarSheet
          onClose={() => setShowRadar(false)}
          onInviteSent={() => setShowRadar(false)}
        />
      )}

      {/* Craving Input */}
      {showCraving && (
        <CravingInput onClose={() => setShowCraving(false)} />
      )}

      {/* Invite Popup */}
      {activeInvite && (
        <InvitePopup
          inviteId={activeInvite.inviteId}
          fromDisplayName={activeInvite.fromDisplayName}
          dishName={activeInvite.dishName}
          onAccept={(matchId) => {
            setActiveInvite(null);
            setActiveMatch({ matchId, dishName: activeInvite.dishName });
          }}
          onReject={() => setActiveInvite(null)}
        />
      )}

      {/* Match Success */}
      {activeMatch && (
        <MatchSuccess
          matchId={activeMatch.matchId}
          dishName={activeMatch.dishName}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </div>
  );
}
