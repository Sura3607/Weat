'use client';

import { useState } from 'react';
import { CameraScreen } from '@/features/camera/CameraScreen';
import { FoodFeed } from '@/features/feed/FoodFeed';
import { RadarSheet } from '@/features/radar/RadarSheet';
import { CravingInput } from '@/features/radar/CravingInput';
import { InvitePopup } from '@/features/invite/InvitePopup';
import { MatchSuccess } from '@/features/match/MatchSuccess';

export default function HomePage() {
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
          Cạ Cứng 🤝
        </button>

        {/* Craving Button - Top Right */}
        <button
          onClick={() => setShowCraving(true)}
          className="touch-target bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
          aria-label="Nhập món đang thèm"
        >
          Thèm Gì? 🤤
        </button>
      </div>

      {/* Swipe up hint for Feed */}
      <div className="absolute bottom-24 left-0 right-0 text-center z-10">
        <button
          onClick={() => setShowFeed(true)}
          className="text-white/60 text-xs animate-pulse"
          aria-label="Vuốt lên xem Feed"
        >
          ↑ Vuốt lên xem Feed bạn bè ↑
        </button>
      </div>

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
