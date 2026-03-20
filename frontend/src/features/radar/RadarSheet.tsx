'use client';

import { useState, useEffect } from 'react';
import api from '@/shared/api/client';

interface RadarItem {
  userId: string;
  displayName: string;
  isFriend: boolean;
  distanceM: number;
  matchScore: number;
  currentCraving: string | null;
  avatarUrl: string | null;
}

interface RadarResponse {
  items: RadarItem[];
}

interface RadarSheetProps {
  onClose: () => void;
  onInviteSent: () => void;
}

export function RadarSheet({ onClose, onInviteSent }: RadarSheetProps) {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRadar() {
      try {
        const data = await api.get<RadarResponse>('/radar?radiusM=200&limit=20');
        setItems(data.items);
      } catch {
        setError('Không thể quét radar');
      } finally {
        setLoading(false);
      }
    }
    fetchRadar();
  }, []);

  async function handleInvite(userId: string, displayName: string) {
    setSendingInvite(userId);
    try {
      await api.post('/invite', {
        toUserId: userId,
        dishName: 'Đi ăn cùng!',
      });
      onInviteSent();
    } catch {
      alert('Không thể gửi lời mời');
    } finally {
      setSendingInvite(null);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="bg-gray-900 rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Radar 🤝</h2>
          <button
            onClick={onClose}
            className="touch-target text-white/60"
            aria-label="Đóng Radar"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading && (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-white/60 text-sm mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-white/20 px-4 py-2 rounded-full text-sm"
              >
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/60 text-sm">
                Không tìm thấy ai gần đây. Hãy thử mở rộng bán kính!
              </p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.userId}
              className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt={item.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">
                    {item.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {item.displayName}
                  </p>
                  {item.isFriend && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      Bạn bè
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs mt-0.5">
                  {item.distanceM}m | Match: {item.matchScore}%
                </p>
                {item.currentCraving && (
                  <p className="text-yellow-400/80 text-xs mt-0.5">
                    Đang thèm: {item.currentCraving}
                  </p>
                )}
              </div>

              {/* Invite Button */}
              <button
                onClick={() => handleInvite(item.userId, item.displayName)}
                disabled={sendingInvite === item.userId}
                className="touch-target bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                aria-label={`Rủ ${item.displayName} đi ăn`}
              >
                {sendingInvite === item.userId ? '...' : 'Rủ đi ăn! ⚡️'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
