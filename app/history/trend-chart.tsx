"use client";

type Point = { date: string; score: number };

export default function TrendChart({ data }: { data: Point[] }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "24px 0",
          color: "var(--muted)",
          fontSize: 14,
        }}
      >
        尚無考試紀錄可顯示趨勢
      </div>
    );
  }

  const margin = { top: 20, right: 24, bottom: 48, left: 44 };
  const width = 600 - margin.left - margin.right;
  const height = 220 - margin.top - margin.bottom;

  const scores = data.map((d) => d.score);
  const minRaw = Math.min(...scores);
  const maxRaw = Math.max(...scores);
  const yMin = Math.max(0, 10 * Math.floor(minRaw / 10) - 10);
  const yMax = Math.min(100, 10 * Math.ceil(maxRaw / 10) + 10);
  const yRange = yMax - yMin || 10;
  const n = data.length;
  const xStep = n > 1 ? width / (n - 1) : width / 2;
  const xAt = (i: number) =>
    margin.left + (n > 1 ? i * xStep : width / 2);
  const yAt = (s: number) =>
    margin.top + height - ((s - yMin) / yRange) * height;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(d.score)}`)
    .join(" ");

  const areaPath = [
    `M ${xAt(0)} ${yAt(data[0].score)}`,
    ...data.slice(1).map((d, i) => `L ${xAt(i + 1)} ${yAt(d.score)}`),
    `L ${xAt(n - 1)} ${margin.top + height}`,
    `L ${xAt(0)} ${margin.top + height}`,
    "Z",
  ].join(" ");

  const ticks: number[] = [];
  for (let v = 20 * Math.ceil(yMin / 20); v <= yMax; v += 20) ticks.push(v);

  const passLineY = yAt(60);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${600} ${220}`}
        style={{ width: "100%", maxWidth: 600, display: "block", margin: "0 auto" }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <line
            key={t}
            x1={margin.left}
            y1={yAt(t)}
            x2={margin.left + width}
            y2={yAt(t)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {60 >= yMin && 60 <= yMax && (
          <>
            <line
              x1={margin.left}
              y1={passLineY}
              x2={margin.left + width}
              y2={passLineY}
              stroke="#f87171"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={margin.left + width + 3}
              y={passLineY + 4}
              fontSize="10"
              fill="#f87171"
            >
              60
            </text>
          </>
        )}

        <path d={areaPath} fill="url(#areaGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={xAt(i)}
              cy={yAt(d.score)}
              r="5"
              fill={d.score >= 60 ? "#7c3aed" : "#f87171"}
              stroke="white"
              strokeWidth="2"
            />
            {(n <= 8 || i === 0 || i === n - 1) && (
              <text
                x={xAt(i)}
                y={yAt(d.score) - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={d.score >= 60 ? "#7c3aed" : "#ef4444"}
              >
                {d.score.toFixed(1)}
              </text>
            )}
          </g>
        ))}

        {ticks.map((t) => (
          <text
            key={`yl-${t}`}
            x={margin.left - 6}
            y={yAt(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#9ca3af"
          >
            {t}
          </text>
        ))}

        {data.map((d, i) => {
          if (n > 8 && i !== 0 && i !== n - 1 && i % Math.ceil(n / 5) !== 0)
            return null;
          return (
            <text
              key={`xl-${i}`}
              x={xAt(i)}
              y={margin.top + height + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {d.date}
            </text>
          );
        })}

        <text
          x={margin.left - 6}
          y={margin.top - 6}
          textAnchor="end"
          fontSize="10"
          fill="#9ca3af"
        >
          分
        </text>

        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + height}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <line
          x1={margin.left}
          y1={margin.top + height}
          x2={margin.left + width}
          y2={margin.top + height}
          stroke="#d1d5db"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
