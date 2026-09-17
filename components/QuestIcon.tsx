"use client";

const ICON_PATHS: Record<string, React.ReactNode> = {
  star: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.407 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  ),
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  ),
  bolt: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  droplet: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3s-5.5 6.1-5.5 9.5a5.5 5.5 0 0011 0C17.5 9.1 12 3 12 3z"
    />
  ),
  book: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  ),
  coffee: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 5h11v8a4 4 0 01-4 4H10a4 4 0 01-4-4V5zm11 2h1.5a2.5 2.5 0 010 5H17"
    />
  ),
  movie: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4h16v16H4V4zm0 4h2m-2 4h2m-2 4h2m12-8h2m-2 4h2m-2 4h2M8 4v2m4-2v2m4-2v2M8 18v2m4-2v2m4-2v2"
    />
  ),
  music: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z"
    />
  ),
  gift: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 12v10H4V12M2 7h20v5H2V7zm10-1V7m0 0H7.5a2.5 2.5 0 010-5C11 2 12 6 12 6zm0 0h4.5a2.5 2.5 0 000-5C13 1 12 6 12 6z"
    />
  ),
  mail: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 2l8 5 8-5"
    />
  ),
  dumbbell: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"
    />
  ),
  sun: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41M12 8a4 4 0 100 8 4 4 0 000-8z"
    />
  ),
  moon: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
    />
  ),
  briefcase: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 7h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2zm4 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-6-2h6"
    />
  ),
  sparkles: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4m-2-2h4m13 2v4m-2-2h4M5 17v4m-2-2h4M17 3l1.5 1.5L20 3v2m-3-2h2M13 6l1 2.5L16.5 10 14 11.5 13 14l-1-2.5L9.5 10 12 8.5 13 6z"
    />
  ),
  leaf: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 19c0-8 5-13 14-14-1 8-6 13-14 14zm0 0c3 0 6-1 8-4"
    />
  ),
};

export const QUEST_ICONS = Object.keys(ICON_PATHS);

interface QuestIconProps {
  icon?: string;
  className?: string;
}

export default function QuestIcon({ icon = "star", className }: QuestIconProps) {
  const path = ICON_PATHS[icon] ?? ICON_PATHS.star;
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {path}
    </svg>
  );
}