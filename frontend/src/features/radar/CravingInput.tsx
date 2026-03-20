'use client';

import { useState } from 'react';
import api from '@/shared/api/client';

interface CravingInputProps {
  onClose: () => void;
}

export function CravingInput({ onClose }: CravingInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.post('/current-craving', {
        cravingText: text.trim(),
        expiresInMin: 60,
      });
      onClose();
    } catch {
      alert('Không thể cập nhật');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 mx-6 w-full max-w-sm animate-fade-in">
        <h2 className="text-lg font-semibold mb-4">Bạn đang thèm gì? 🤤</h2>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="VD: Bún Bò Huế, Phở, Cơm Tấm..."
          maxLength={80}
          autoFocus
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />

        <p className="text-white/40 text-xs mt-2 text-right">
          {text.length}/80
        </p>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 py-3 rounded-xl text-sm font-medium"
          >
            Để sau
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="flex-1 bg-red-500 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
