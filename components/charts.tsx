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
  background: "#1a222c",
  border: "1px solid #374352",
  borderRadius: 6,
  fontSize: 11,
  color: "#d1dae4",
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
    <>
      <section className="panel chart-panel overflow-hidden">
        <div className="section-heading">
          <div>
            <div className="eyebrow subtle">КАК МЕНЯЛАСЬ ИГРА</div>
            <h2>График преимущества</h2>
          </div>
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
        <div className="flex gap-5 text-[10px] muted mb-5">
          <span className="green">● Radiant (выше нуля)</span>
          <span className="red">● Dire (ниже нуля)</span>
        </div>
        {data.length ? (
          <div style={{ height: 270, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="lead-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#58c89d" stopOpacity={0.3} />
                    <stop
                      offset="100%"
                      stopColor="#58c89d"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff07" vertical={false} />
                <XAxis
                  dataKey="minute"
                  tickFormatter={(n) => `${n}м`}
                  stroke="#36424e"
                  tick={{ fill: "#6c7c8b", fontSize: 10 }}
                  tickLine={false}
                  tickMargin={6}
                  minTickGap={16}
                  padding={{ left: 6, right: 10 }}
                />
                <YAxis
                  width={42}
                  tickFormatter={(n) => `${Math.round(n / 1000)}k`}
                  stroke="transparent"
                  tick={{ fill: "#6c7c8b", fontSize: 10 }}
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
                <ReferenceLine y={0} stroke="#59606b" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="lead"
                  stroke="#60c8a1"
                  strokeWidth={2}
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
          <h2>Сравнение импакта</h2>
          <span className="muted text-[10px]">
            {m.source === "opendota" ? "Локальная оценка ≈" : "STRATZ IMP"}
          </span>
        </div>
        <div style={{ height: 275, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={m.players.map((p) => ({
                hero: heroName(p.heroId),
                score: impactScore(p),
                team: p.team,
              }))}
              margin={{ top: 12, right: 16, left: 4, bottom: 42 }}
            >
              <CartesianGrid stroke="#ffffff07" vertical={false} />
              <XAxis
                dataKey="hero"
                interval={0}
                tick={{ fontSize: 8, fill: "#8694a3" }}
                angle={-25}
                textAnchor="end"
                tickMargin={4}
                stroke="#36424e"
              />
              <YAxis
                width={38}
                domain={[-100, 100]}
                tick={{ fontSize: 9, fill: "#6c7c8b" }}
                stroke="transparent"
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                wrapperStyle={tooltipWrapperStyle}
                allowEscapeViewBox={{ x: false, y: false }}
                cursor={{ fill: "#ffffff05" }}
              />
              <ReferenceLine y={0} stroke="#4d5a68" />
              <Bar
                dataKey="score"
                name="Импакт"
                radius={[3, 3, 0, 0]}
                maxBarSize={35}
              >
                {m.players.map((p, i) => (
                  <Cell
                    key={i}
                    fill={impactScore(p) >= 0 ? "#60bb98" : "#cd7185"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
