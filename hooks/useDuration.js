import { useState, useEffect } from 'react';

export const calculateDuration = (startTime, endTime) => {
  const end = endTime ? new Date(endTime) : new Date();
  const start = new Date(startTime);
  const diffMs = end - start;
  
  if (diffMs < 0) return "0 Days 0 Hours 0 Minutes";
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const diffMinutes = Math.floor((diffMs / 1000 / 60) % 60);
  
  return `${diffDays} Days ${diffHours} Hours ${diffMinutes} Minutes`;
};

export const useDuration = (startTime, endTime) => {
  const [duration, setDuration] = useState(calculateDuration(startTime, endTime));

  useEffect(() => {
    if (endTime) {
      setDuration(calculateDuration(startTime, endTime));
      return;
    }

    const interval = setInterval(() => {
      setDuration(calculateDuration(startTime, null));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return duration;
};
