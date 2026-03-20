'use client';

import { useState, useEffect } from 'react';
import api from '@/shared/api/client';

interface FeedItem {
  foodLogId: string;
  authorName: string;
  dishName: string;
  imageUrl: string;
  capturedAt: string;
}

interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

interface FoodFeedProps {
  onClose: () => void;
}

export function FoodFeed({ onClose }: FoodFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const data = await api.get<FeedResponse>('/feed?limit=20');
        setItems(data.items);
      } catch {
        setError('Không thể tải feed');
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, []);

  function formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="bg-gray-900 rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Feed Bạn Bè</h2>
          <button
            onClick={onClose}
            className="touch-target text-white/60"
            aria-label="Đóng Feed"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-safe-area-bottom">
          {loading && (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-16 h-16 bg-white/10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
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
                Chưa có ảnh nào từ bạn bè. Hãy kết bạn và chụp món đầu tiên!
              </p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.foodLogId}
              className="flex gap-3 py-3 border-b border-white/10 last:border-0"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                <img
                  src={item.imageUrl}
                  alt={item.dishName || 'Food'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {item.dishName || 'Đang nhận diện...'}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {item.authorName}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {formatTime(item.capturedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
