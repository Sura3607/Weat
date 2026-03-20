'use client';

import { useState } from 'react';
import api from '@/shared/api/client';

interface InvitePopupProps {
  inviteId: string;
  fromDisplayName: string;
  dishName: string;
  onAccept: (matchId: string) => void;
  onReject: () => void;
}

interface AcceptResponse {
  inviteId: string;
  status: string;
  matchId: string;
}

export function InvitePopup({
  inviteId,
  fromDisplayName,
  dishName,
  onAccept,
  onReject,
}: InvitePopupProps) {
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      const data = await api.post<AcceptResponse>('/accept-invite', { inviteId });
      onAccept(data.matchId);
    } catch {
      alert('Không thể chấp nhận lời mời');
      setAccepting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-gray-900 rounded-3xl p-6 mx-6 w-full max-w-sm animate-slide-up text-center">
        {/* Emoji */}
        <div className="text-5xl mb-4">⚡️</div>

        {/* Message */}
        <h2 className="text-xl font-bold mb-2">Lời mời đi ăn!</h2>
        <p className="text-white/80 text-sm mb-1">
          <span className="font-semibold text-yellow-400">{fromDisplayName}</span>{' '}
          vừa rủ bạn đi ăn
        </p>
        <p className="text-2xl font-bold text-red-400 mb-6">{dishName}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 bg-white/10 py-4 rounded-2xl text-sm font-medium active:scale-95 transition-transform"
          >
            Để sau
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 bg-red-500 py-4 rounded-2xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {accepting ? 'Đang xử lý...' : 'Đi luôn! 🤤'}
          </button>
        </div>
      </div>
    </div>
  );
}
