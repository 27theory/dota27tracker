"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Match } from "@/lib/types";
import { heroName } from "@/lib/format";
import { impactScore } from "@/lib/impact-analyzer";

const tooltipStyle = {
  background: "#14191f",
  border: "1px solid #262c33",
  borderRadius: 4,
  fontSize: 11,
  color: "#eceef0",
  fontVariantNumeric: "tabular-nums" as const,
};

const tooltipWrapperStyle = {
  zIndex: 20,
  maxWidth: "calc(100vw - 48px)",
  whiteSpace: "normal" as const,
};

export function MatchCharts({ match: m }: { match: Match }) {
  const [metric, setMetric] = useState<"gold" | "xp">("gold");
  const data = (metric === "gold" ? m.goldLeads : m.xpLeads).map(
    (lead, minute) => ({ minute, lead }),
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-4 tabular-nums">
      <section className="panel chart-panel overflow-hidden">
        <div className="section-heading">
          <h2>График преимущества</h2>
          <div className="chart-tabs">
            <button
              className={metric === "gold" ? "active" : ""}
              onClick={() => setMetric("gold")}
            >
              Золото
            </button>
            <button
              className={metric === "xp" ? "active" : ""}
              onClick={() => setMetric("xp")}
            >
              Опыт
            </button>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] muted mb-3">
          <span className="green">● Radiant (&gt; 0)</span>
          <span className="red">● Dire (&lt; 0)</span>
        </div>
        {data.length ? (
          <div style={{ height: 235, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="lead-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#61c6a0" stopOpacity={0.22} />
                    <stop
                      offset="100%"
                      stopColor="#61c6a0"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e252e" vertical={false} />
                <XAxis
                  dataKey="minute"
                  tickFormatter={(n) => `${n}м`}
                  stroke="#262c33"
                  tick={{ fill: "#8c929c", fontSize: 10 }}
                  tickLine={false}
                  tickMargin={5}
                  minTickGap={16}
                />
                <YAxis
                  width={40}
                  tickFormatter={(n) => `${Math.round(n / 1000)}k`}
                  stroke="transparent"
                  tick={{ fill: "#8c929c", fontSize: 10 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  wrapperStyle={tooltipWrapperStyle}
                  allowEscapeViewBox={{ x: false, y: false }}
                  labelFormatter={(n) => `${n}-я минута`}
                  formatter={(v) => [
                    Number(v).toLocaleString("ru-RU"),
                    metric === "gold" ? "Золото R−D" : "Опыт R−D",
                  ]}
                />
                <ReferenceLine y={0} stroke="#38414d" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="lead"
                  stroke="#61c6a0"
                  strokeWidth={1.75}
                  fill="url(#lead-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="notice">
            График недоступен: матч ещё не разобран источником.
          </div>
        )}
      </section>
      <section className="panel chart-panel overflow-hidden">
        <div className="section-heading">
          <h2>Распределение IMP</h2>
          <span className="muted text-[10px]">
            {m.source === "opendota" ? "Оценка ≈" : "STRATZ IMP"}
          </span>
        </div>
        <div style={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={m.players.map((p) => ({
                hero: heroName(p.heroId),
                score: impactScore(p),
                team: p.team,
              }))}
              margin={{ top: 8, right: 12, left: 0, bottom: 38 }}
            >
              <CartesianGrid stroke="#1e252e" vertical={false} />
              <XAxis
                dataKey="hero"
                interval={0}
                tick={{ fontSize: 9, fill: "#8c929c" }}
                angle={-25}
                textAnchor="end"
                tickMargin={4}
                stroke="#262c33"
              />
              <YAxis
                width={34}
                domain={[-100, 100]}
                tick={{ fontSize: 9, fill: "#8c929c" }}
                stroke="transparent"
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                wrapperStyle={tooltipWrapperStyle}
                allowEscapeViewBox={{ x: false, y: false }}
                cursor={{ fill: "#ffffff05" }}
              />
              <ReferenceLine y={0} stroke="#38414d" />
              <Bar
                dataKey="score"
                name="IMP"
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
              >
                {m.players.map((p, i) => (
                  <Cell
                    key={i}
                    fill={impactScore(p) >= 0 ? "#61c6a0" : "#e77c8e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
