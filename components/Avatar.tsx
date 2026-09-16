"use client";

import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string;
}

export default function Avatar({ src, name, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (failed || !src) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-rose-100 text-sm font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400`}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  );
}