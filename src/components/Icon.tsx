// Icônes au trait du design : un tracé par chaîne, « c:x,y,r » pour un cercle.
const PATHS = {
  search: ["c:11,11,7", "M16.5 16.5 21 21"],
  plus: ["M12 5v14M5 12h14"],
  minus: ["M5 12h14"],
  path: ["M5 21c0-5 4-6 7-9s3-6 7-9", "c:5,21,1.2", "c:19,3,1.2"],
  grid: ["M4 4h16v16H4z", "M4 9.33h16M4 14.67h16M9.33 4v16M14.67 4v16"],
  clock: ["c:12,12,9", "M12 7v5l3 2"],
  calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3v4M16 3v4"],
  sliders: ["M4 7h9M17 7h3M4 17h3M11 17h9", "c:15,7,2", "c:9,17,2"],
  compass: ["c:12,12,9", "M15.5 8.5l-2 5-5 2 2-5z"],
  wind: ["M3 8h11a3 3 0 1 0-3-3", "M3 12h15a3 3 0 1 1-3 3", "M3 16h7"],
  tree: ["M12 22V9M12 14 7 9M12 12l5-5", "c:7,7.5,2", "c:17,5.5,2", "c:12,6,2"],
  orbit: ["c:12,12,2.5", "c:12,12,8", "c:18,6.5,1.6"],
  pyramid: ["M3 4h18l-9 16z", "M6.5 9h11M9.5 14.5h5"],
  recenter: ["c:12,12,3", "M12 2v4M12 18v4M2 12h4M18 12h4"],
  branch: ["c:6,5,2", "c:6,19,2", "c:18,8,2", "M6 7v10M18 10c0 4-6 3-11 7"],
  book: ["M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"],
  users: ["c:9,8,3.5", "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", "M16 4.6a3.5 3.5 0 0 1 0 6.8", "M21 20c0-2.6-1.6-4.8-4-5.6"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  image: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "c:8.5,10,1.5", "M21 16l-5-5-9 8"],
  bold: ["M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"],
  italic: ["M10 5h8M6 19h8M14 5l-4 14"],
  heading: ["M6 5v14M18 5v14M6 12h12"],
  list: ["M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"],
  quote: ["M6 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6"],
  check: ["M5 12.5l4.5 4.5L19 7"],
  alert: ["M12 3.5 21.5 20h-19z", "M12 10v4M12 17h.01"],
  user: ["c:12,8,4", "M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"],
  logout: ["M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  edit: ["M4 20h4L19 9l-4-4L4 16z"],
  trash: ["M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"],
  upload: ["M12 16V4M7 9l5-5 5 5M4 20h16"],
  arrowR: ["M5 12h14M13 6l6 6-6 6"],
  arrowL: ["M19 12H5M11 6l-6 6 6 6"],
  chevron: ["M6 9l6 6 6-6"],
  close: ["M6 6l12 12M18 6 6 18"],
  moon: ["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"],
  sun: ["c:12,12,4", "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="icon"
    >
      {PATHS[name].map((path) => {
        if (!path.startsWith("c:")) return <path key={path} d={path} />;
        const [cx, cy, r] = path.slice(2).split(",");
        return <circle key={path} cx={cx} cy={cy} r={r} />;
      })}
    </svg>
  );
}

// Étoile à huit branches du logo : deux carrés tournés de 45°.
export function Star({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="star">
      <rect x="5" y="5" width="14" height="14" fill="currentColor" />
      <rect x="5" y="5" width="14" height="14" fill="currentColor" transform="rotate(45 12 12)" />
    </svg>
  );
}
