export type AuthVariant = "staff" | "owner" | "admin";

function StaffArt() {
  return (
    <>
      <div
        className="auth-drift-a absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--brand-mid)", opacity: 0.55 }}
      />
      <div
        className="auth-drift-b absolute top-1/3 -right-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--mpesa-light)", opacity: 0.6 }}
      />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="receipt-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="var(--brand-dark)" opacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#receipt-dots)" />
      </svg>
    </>
  );
}

function OwnerArt() {
  const roofs = [
    { x: 0, w: 120, h: 130 },
    { x: 118, w: 90, h: 175 },
    { x: 206, w: 130, h: 110 },
    { x: 334, w: 100, h: 200 },
    { x: 432, w: 140, h: 145 },
    { x: 570, w: 95, h: 185 },
    { x: 663, w: 125, h: 120 },
    { x: 786, w: 110, h: 165 },
    { x: 894, w: 135, h: 135 },
    { x: 1027, w: 100, h: 195 },
    { x: 1125, w: 130, h: 115 },
    { x: 1253, w: 110, h: 170 },
  ];
  return (
    <>
      <div
        className="auth-drift-a absolute -top-32 left-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--brand-light)", opacity: 0.8 }}
      />
      <div
        className="auth-drift-b absolute top-10 -right-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--mpesa-light)", opacity: 0.5 }}
      />
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: "42%" }}
        viewBox="0 0 1400 220"
        preserveAspectRatio="xMidYMax slice"
      >
        {roofs.map((r, i) => (
          <g key={i}>
            <rect
              x={r.x}
              y={220 - r.h}
              width={r.w}
              height={r.h}
              fill={i % 3 === 0 ? "var(--brand-dark)" : i % 3 === 1 ? "var(--mpesa)" : "var(--brand)"}
              opacity={0.14}
            />
            <path
              d={`M ${r.x - 6} ${220 - r.h} L ${r.x + r.w / 2} ${220 - r.h - 34} L ${r.x + r.w + 6} ${220 - r.h} Z`}
              fill={i % 3 === 0 ? "var(--brand-dark)" : i % 3 === 1 ? "var(--mpesa)" : "var(--brand)"}
              opacity={0.18}
            />
            <rect
              x={r.x + r.w / 2 - 14}
              y={220 - 46}
              width={28}
              height={46}
              fill="var(--bg)"
              opacity={0.7}
            />
          </g>
        ))}
      </svg>
    </>
  );
}

function AdminArt() {
  const nodes = [
    [80, 90], [260, 60], [420, 150], [180, 220], [560, 90],
    [340, 280], [640, 260], [120, 340], [480, 340], [700, 140],
  ];
  const edges = [
    [0, 1], [1, 2], [0, 3], [2, 4], [3, 5], [4, 6], [5, 7], [5, 8], [4, 9], [2, 8],
  ];
  return (
    <>
      <div
        className="auth-drift-a absolute -top-28 -right-16 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--admin-accent)", opacity: 0.22 }}
      />
      <div
        className="auth-drift-b absolute bottom-0 left-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "var(--admin-ink)", opacity: 0.12 }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid-lines" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--admin-ink)" strokeWidth="0.5" opacity="0.08" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-lines)" />
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]}
            x2={nodes[b][0]} y2={nodes[b][1]}
            stroke="var(--admin-accent)"
            strokeWidth="1"
            opacity="0.28"
          />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.5} fill="var(--admin-ink)" opacity="0.3" />
        ))}
      </svg>
    </>
  );
}

const BG_TINT: Record<AuthVariant, string> = {
  staff: "var(--bg)",
  owner: "var(--bg)",
  admin: "var(--bg)",
};

export default function AuthBackdrop({ variant }: { variant: AuthVariant }) {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ background: BG_TINT[variant], zIndex: 0 }}
      aria-hidden="true"
    >
      {variant === "staff" && <StaffArt />}
      {variant === "owner" && <OwnerArt />}
      {variant === "admin" && <AdminArt />}
    </div>
  );
}
