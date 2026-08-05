import { useState, useEffect } from 'react';

export const useCountdown = (targetDate: string | Date) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      setTimeLeft(Math.max(0, diff));
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hms = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    // Birden fazla gün varsa süreyi "X gün HH:MM:SS" olarak göster (aksi halde günler kaybolurdu)
    return days > 0 ? `${days} gün ${hms}` : hms;
  };

  return {
    formatted: formatTime(timeLeft),
    remaining: timeLeft,
    isExpired: timeLeft <= 0,
  };
};
