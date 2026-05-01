import React from "react";

const TEAL = "#6B2FE6";
const NAVY = "#1E2155";

// ══════════════════════════════════════════════════════════
// CHART PRIMITIVES — lightweight, crisp SVG IELTS-style charts
// ══════════════════════════════════════════════════════════

const PALETTE = ["#1E2155", "#6B2FE6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

function ChartFrame({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 sm:p-6" style={{ border: "1px solid #e2e8f0" }}>
      <h4 className="text-center font-bold text-[14px] sm:text-[15px] text-gray-900 mb-4 leading-snug">{title}</h4>
      <div className="w-full overflow-x-auto">{children}</div>
      {source && <p className="text-[10px] text-gray-400 text-center mt-3 italic">{source}</p>}
    </div>
  );
}

function BarChart({
  title,
  yLabel,
  categories,
  seriesNames,
  data,
  source,
  yMax,
  yStep,
}: {
  title: string;
  yLabel: string;
  categories: string[];
  seriesNames: string[];
  data: number[][];
  source?: string;
  yMax: number;
  yStep: number;
}) {
  const W = 620, H = 320, padL = 54, padR = 20, padT = 20, padB = 60;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const numGroups = categories.length, numBars = seriesNames.length;
  const groupW = plotW / numGroups;
  const barW = (groupW * 0.72) / numBars;

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) ticks.push(v);

  return (
    <ChartFrame title={title} source={source}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 620 }}>
        {/* Y-axis label */}
        <text x={14} y={padT + plotH / 2} transform={`rotate(-90, 14, ${padT + plotH / 2})`} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">{yLabel}</text>
        {/* gridlines + y-ticks */}
        {ticks.map((t) => {
          const y = padT + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        {/* axes */}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#0f172a" strokeWidth={1.2} />
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#0f172a" strokeWidth={1.2} />
        {/* bars */}
        {categories.map((cat, gi) => {
          const groupX = padL + gi * groupW + groupW / 2;
          return (
            <g key={gi}>
              {seriesNames.map((_, si) => {
                const val = data[si][gi];
                const h = (val / yMax) * plotH;
                const x = groupX - (numBars * barW) / 2 + si * barW;
                const y = padT + plotH - h;
                return (
                  <g key={si}>
                    <rect x={x} y={y} width={barW - 1} height={h} fill={PALETTE[si]} />
                    <text x={x + (barW - 1) / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#334155" fontWeight="600">{val}</text>
                  </g>
                );
              })}
              <text x={groupX} y={padT + plotH + 16} textAnchor="middle" fontSize="10.5" fill="#334155" fontWeight="600">{cat}</text>
            </g>
          );
        })}
        {/* legend */}
        {seriesNames.map((n, i) => (
          <g key={i} transform={`translate(${padL + i * 130}, ${H - 24})`}>
            <rect width={12} height={12} fill={PALETTE[i]} />
            <text x={18} y={10} fontSize="10.5" fill="#334155" fontWeight="600">{n}</text>
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

function LineChart({
  title,
  yLabel,
  xLabels,
  seriesNames,
  data,
  source,
  yMax,
  yStep,
}: {
  title: string;
  yLabel: string;
  xLabels: string[];
  seriesNames: string[];
  data: number[][];
  source?: string;
  yMax: number;
  yStep: number;
}) {
  const W = 620, H = 320, padL = 54, padR = 20, padT = 20, padB = 60;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = xLabels.length;
  const stepX = plotW / (n - 1);
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += yStep) ticks.push(v);

  return (
    <ChartFrame title={title} source={source}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 620 }}>
        <text x={14} y={padT + plotH / 2} transform={`rotate(-90, 14, ${padT + plotH / 2})`} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">{yLabel}</text>
        {ticks.map((t) => {
          const y = padT + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
            </g>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#0f172a" strokeWidth={1.2} />
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#0f172a" strokeWidth={1.2} />
        {xLabels.map((lbl, i) => (
          <text key={i} x={padL + i * stepX} y={padT + plotH + 16} textAnchor="middle" fontSize="10.5" fill="#334155" fontWeight="600">{lbl}</text>
        ))}
        {seriesNames.map((_, si) => {
          const pts = data[si].map((v, i) => `${padL + i * stepX},${padT + plotH - (v / yMax) * plotH}`).join(" ");
          return <polyline key={si} points={pts} fill="none" stroke={PALETTE[si]} strokeWidth={2.2} />;
        })}
        {seriesNames.map((_, si) => data[si].map((v, i) => (
          <circle key={`${si}-${i}`} cx={padL + i * stepX} cy={padT + plotH - (v / yMax) * plotH} r={3.2} fill={PALETTE[si]} />
        )))}
        {seriesNames.map((n, i) => (
          <g key={i} transform={`translate(${padL + i * 160}, ${H - 24})`}>
            <line x1={0} x2={20} y1={6} y2={6} stroke={PALETTE[i]} strokeWidth={2.4} />
            <circle cx={10} cy={6} r={3.2} fill={PALETTE[i]} />
            <text x={26} y={10} fontSize="10.5" fill="#334155" fontWeight="600">{n}</text>
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

function PieChartSvg({ slices, cx, cy, r }: { slices: { label: string; value: number }[]; cx: number; cy: number; r: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  let start = -Math.PI / 2;
  return (
    <g>
      {slices.map((s, i) => {
        const angle = (s.value / total) * Math.PI * 2;
        const end = start + angle;
        const large = angle > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        const midA = start + angle / 2;
        const lx = cx + r * 0.62 * Math.cos(midA);
        const ly = cy + r * 0.62 * Math.sin(midA);
        const result = (
          <g key={i}>
            <path d={path} fill={PALETTE[i]} stroke="white" strokeWidth={1.5} />
            {s.value >= 6 && (
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="700">{s.value}%</text>
            )}
          </g>
        );
        start = end;
        return result;
      })}
    </g>
  );
}

function PieChart({
  title,
  pies,
  slices,
  source,
}: {
  title: string;
  pies: { label: string; data: { label: string; value: number }[] }[];
  slices: string[]; // legend labels
  source?: string;
}) {
  const W = 620, H = pies.length > 1 ? 340 : 320;
  const pieR = 110;
  const spacing = W / (pies.length + 1);

  return (
    <ChartFrame title={title} source={source}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 620 }}>
        {pies.map((p, i) => (
          <g key={i}>
            <PieChartSvg slices={p.data} cx={spacing * (i + 1)} cy={pieR + 30} r={pieR} />
            <text x={spacing * (i + 1)} y={pieR * 2 + 55} textAnchor="middle" fontSize="13" fill="#0f172a" fontWeight="700">{p.label}</text>
          </g>
        ))}
        {slices.map((s, i) => (
          <g key={i} transform={`translate(${40 + (i % 3) * 200}, ${H - 26 + Math.floor(i / 3) * 14})`}>
            <rect width={12} height={12} fill={PALETTE[i]} />
            <text x={18} y={10} fontSize="10.5" fill="#334155" fontWeight="600">{s}</text>
          </g>
        ))}
      </svg>
    </ChartFrame>
  );
}

// Process diagram & Map components use hand-crafted SVG strings
function RawSvg({ title, svg, source }: { title: string; svg: string; source?: string }) {
  return (
    <ChartFrame title={title} source={source}>
      <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </ChartFrame>
  );
}

// ══════════════════════════════════════════════════════════
// ASSIGNMENT TYPES
// ══════════════════════════════════════════════════════════

export type AssignmentCategory = "Task 1" | "Task 2" | "Paragraph";

export interface Assignment {
  id: string;
  category: AssignmentCategory;
  subtype: string;
  prompt: string;           // full instruction shown to student
  minWords: number;         // minimum word count
  visual?: React.ReactNode; // Task 1 only
  context?: string;         // Paragraph only — short scenario
}

// ══════════════════════════════════════════════════════════
// TASK 1 ASSIGNMENTS (15 — 3 per type)
// ══════════════════════════════════════════════════════════

const TASK1_INSTRUCTION = "You should spend about 20 minutes on this task. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.";

const TASK1: Assignment[] = [
  // --- BAR CHARTS (3) ---
  {
    id: "t1-bar-1",
    category: "Task 1",
    subtype: "Bar Chart",
    minWords: 150,
    prompt: `The bar chart below shows the percentage of households with different levels of monthly income in the United Kingdom in 1990 and 2020.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <BarChart
        title="Percentage of UK households by monthly income, 1990 and 2020"
        yLabel="% of households"
        categories={["Under £1,000", "£1,000–£2,000", "£2,000–£3,500", "£3,500–£5,000", "Over £5,000"]}
        seriesNames={["1990", "2020"]}
        data={[[32, 38, 18, 8, 4], [14, 22, 28, 22, 14]]}
        yMax={50}
        yStep={10}
        source="Source: UK Office for National Statistics"
      />
    ),
  },
  {
    id: "t1-bar-2",
    category: "Task 1",
    subtype: "Bar Chart",
    minWords: 150,
    prompt: `The chart below shows the amount of energy (in million tonnes of oil equivalent) consumed by four sectors in three countries in 2022.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <BarChart
        title="Energy consumption by sector across three countries, 2022 (million tonnes of oil equivalent)"
        yLabel="Mtoe"
        categories={["Industry", "Transport", "Residential", "Services"]}
        seriesNames={["Germany", "Japan", "Brazil"]}
        data={[[62, 55, 48, 25], [78, 72, 40, 28], [45, 60, 30, 18]]}
        yMax={100}
        yStep={20}
        source="Source: International Energy Agency"
      />
    ),
  },
  {
    id: "t1-bar-3",
    category: "Task 1",
    subtype: "Bar Chart",
    minWords: 150,
    prompt: `The chart below shows the number of students (in thousands) enrolled in four university subjects at a university in Canada in 2005, 2015 and 2025.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <BarChart
        title="Student enrolment by subject at a Canadian university, 2005–2025 (thousands)"
        yLabel="Students (000s)"
        categories={["Engineering", "Business", "Arts", "Medicine"]}
        seriesNames={["2005", "2015", "2025"]}
        data={[[3.2, 4.5, 5.6, 1.8], [4.8, 6.2, 4.2, 2.4], [6.5, 7.8, 3.0, 3.2]]}
        yMax={10}
        yStep={2}
      />
    ),
  },
  // --- LINE GRAPHS (3) ---
  {
    id: "t1-line-1",
    category: "Task 1",
    subtype: "Line Graph",
    minWords: 150,
    prompt: `The graph below shows carbon dioxide emissions per person (in tonnes) in four countries from 1980 to 2020.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <LineChart
        title="CO₂ emissions per person, 1980–2020 (tonnes per capita)"
        yLabel="Tonnes per capita"
        xLabels={["1980", "1990", "2000", "2010", "2020"]}
        seriesNames={["USA", "China", "Germany", "India"]}
        data={[[20, 19.5, 20.2, 17.5, 14.8], [1.5, 2.1, 2.8, 6.5, 7.4], [13.2, 11.5, 10.1, 9.2, 7.8], [0.5, 0.7, 1.0, 1.6, 2.0]]}
        yMax={25}
        yStep={5}
        source="Source: World Bank"
      />
    ),
  },
  {
    id: "t1-line-2",
    category: "Task 1",
    subtype: "Line Graph",
    minWords: 150,
    prompt: `The graph below shows the percentage of the population using the internet in three regions from 2000 to 2020.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <LineChart
        title="Internet users as % of population, 2000–2020"
        yLabel="% of population"
        xLabels={["2000", "2005", "2010", "2015", "2020"]}
        seriesNames={["Europe", "Asia", "Africa"]}
        data={[[18, 42, 68, 78, 87], [4, 10, 25, 42, 60], [1, 3, 10, 22, 43]]}
        yMax={100}
        yStep={20}
        source="Source: International Telecommunication Union"
      />
    ),
  },
  {
    id: "t1-line-3",
    category: "Task 1",
    subtype: "Line Graph",
    minWords: 150,
    prompt: `The graph below shows average weekly cinema attendance (in millions) in three cities from 1990 to 2020.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <LineChart
        title="Average weekly cinema attendance, 1990–2020 (millions)"
        yLabel="Millions"
        xLabels={["1990", "2000", "2010", "2020"]}
        seriesNames={["London", "Paris", "Tokyo"]}
        data={[[2.8, 3.2, 3.8, 2.2], [2.2, 2.8, 3.0, 1.8], [3.5, 3.0, 2.4, 1.5]]}
        yMax={5}
        yStep={1}
      />
    ),
  },
  // --- PIE CHARTS (3) ---
  {
    id: "t1-pie-1",
    category: "Task 1",
    subtype: "Pie Chart",
    minWords: 150,
    prompt: `The pie charts below show the proportion of household monthly expenditure on six categories in two countries in 2023.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <PieChart
        title="Household monthly expenditure by category, 2023"
        pies={[
          { label: "Country A", data: [{ label: "Housing", value: 32 }, { label: "Food", value: 22 }, { label: "Transport", value: 14 }, { label: "Education", value: 8 }, { label: "Leisure", value: 10 }, { label: "Other", value: 14 }] },
          { label: "Country B", data: [{ label: "Housing", value: 20 }, { label: "Food", value: 36 }, { label: "Transport", value: 10 }, { label: "Education", value: 16 }, { label: "Leisure", value: 6 }, { label: "Other", value: 12 }] },
        ]}
        slices={["Housing", "Food", "Transport", "Education", "Leisure", "Other"]}
      />
    ),
  },
  {
    id: "t1-pie-2",
    category: "Task 1",
    subtype: "Pie Chart",
    minWords: 150,
    prompt: `The pie chart below shows the main causes of road traffic accidents in a European country in 2024.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <PieChart
        title="Main causes of road traffic accidents, 2024"
        pies={[{ label: "All causes", data: [
          { label: "Speeding", value: 32 },
          { label: "Distracted driving", value: 24 },
          { label: "Drink driving", value: 18 },
          { label: "Bad weather", value: 14 },
          { label: "Vehicle failure", value: 12 },
        ] }]}
        slices={["Speeding", "Distracted driving", "Drink driving", "Bad weather", "Vehicle failure"]}
      />
    ),
  },
  {
    id: "t1-pie-3",
    category: "Task 1",
    subtype: "Pie Chart",
    minWords: 150,
    prompt: `The pie charts below show the sources of electricity generation in a country in 2000 and 2022.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <PieChart
        title="Sources of electricity generation, 2000 and 2022"
        pies={[
          { label: "2000", data: [{ label: "Coal", value: 48 }, { label: "Gas", value: 20 }, { label: "Nuclear", value: 18 }, { label: "Hydro", value: 10 }, { label: "Wind & Solar", value: 2 }, { label: "Oil", value: 2 }] },
          { label: "2022", data: [{ label: "Coal", value: 22 }, { label: "Gas", value: 28 }, { label: "Nuclear", value: 14 }, { label: "Hydro", value: 10 }, { label: "Wind & Solar", value: 24 }, { label: "Oil", value: 2 }] },
        ]}
        slices={["Coal", "Gas", "Nuclear", "Hydro", "Wind & Solar", "Oil"]}
      />
    ),
  },
  // --- PROCESS DIAGRAMS (3) ---
  {
    id: "t1-proc-1",
    category: "Task 1",
    subtype: "Process Diagram",
    minWords: 150,
    prompt: `The diagram below shows the life cycle of a butterfly.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="The life cycle of a butterfly"
        svg={`<svg viewBox="0 0 640 340" style="width:100%;max-width:640px" xmlns="http://www.w3.org/2000/svg">
          <defs><marker id="a1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#1E2155"/></marker></defs>
          <!-- Stage 1: Eggs on leaf -->
          <g transform="translate(40,60)">
            <path d="M0,40 Q40,0 80,20 Q120,40 100,80 Q60,110 20,90 Z" fill="#10B981" stroke="#065F46" stroke-width="1.5"/>
            <circle cx="45" cy="52" r="3" fill="#FBBF24"/><circle cx="55" cy="48" r="3" fill="#FBBF24"/>
            <circle cx="50" cy="60" r="3" fill="#FBBF24"/><circle cx="60" cy="58" r="3" fill="#FBBF24"/>
            <circle cx="42" cy="64" r="3" fill="#FBBF24"/>
            <text x="50" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">1. Eggs</text>
            <text x="50" y="156" text-anchor="middle" font-size="10" fill="#64748b">laid on a leaf</text>
          </g>
          <line x1="150" y1="100" x2="200" y2="100" stroke="#1E2155" stroke-width="2" marker-end="url(#a1)"/>
          <!-- Stage 2: Caterpillar -->
          <g transform="translate(210,70)">
            <ellipse cx="20" cy="30" rx="14" ry="12" fill="#84CC16" stroke="#3F6212" stroke-width="1.2"/>
            <ellipse cx="40" cy="30" rx="14" ry="12" fill="#84CC16" stroke="#3F6212" stroke-width="1.2"/>
            <ellipse cx="60" cy="30" rx="14" ry="12" fill="#84CC16" stroke="#3F6212" stroke-width="1.2"/>
            <ellipse cx="80" cy="30" rx="14" ry="12" fill="#84CC16" stroke="#3F6212" stroke-width="1.2"/>
            <circle cx="88" cy="26" r="2" fill="#1E2155"/>
            <text x="50" y="130" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">2. Caterpillar</text>
            <text x="50" y="146" text-anchor="middle" font-size="10" fill="#64748b">feeds and grows</text>
          </g>
          <line x1="320" y1="100" x2="370" y2="100" stroke="#1E2155" stroke-width="2" marker-end="url(#a1)"/>
          <!-- Stage 3: Chrysalis -->
          <g transform="translate(380,60)">
            <path d="M50,10 Q75,40 65,90 Q50,105 35,90 Q25,40 50,10 Z" fill="#A16207" stroke="#422006" stroke-width="1.5"/>
            <path d="M42,30 L58,30 M42,50 L58,50 M42,70 L58,70" stroke="#422006" stroke-width="1"/>
            <text x="50" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">3. Chrysalis</text>
            <text x="50" y="156" text-anchor="middle" font-size="10" fill="#64748b">pupa stage, ~2 weeks</text>
          </g>
          <line x1="490" y1="100" x2="540" y2="100" stroke="#1E2155" stroke-width="2" marker-end="url(#a1)"/>
          <!-- Stage 4: Butterfly -->
          <g transform="translate(545,55)">
            <ellipse cx="40" cy="50" rx="5" ry="22" fill="#1E2155"/>
            <path d="M40,35 Q10,15 5,45 Q15,65 40,55 Z" fill="#F59E0B" stroke="#7C2D12" stroke-width="1.2"/>
            <path d="M40,35 Q70,15 75,45 Q65,65 40,55 Z" fill="#F59E0B" stroke="#7C2D12" stroke-width="1.2"/>
            <path d="M40,55 Q20,70 20,85 Q35,80 40,70 Z" fill="#EF4444" stroke="#7C2D12" stroke-width="1"/>
            <path d="M40,55 Q60,70 60,85 Q45,80 40,70 Z" fill="#EF4444" stroke="#7C2D12" stroke-width="1"/>
            <text x="40" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">4. Butterfly</text>
            <text x="40" y="156" text-anchor="middle" font-size="10" fill="#64748b">adult emerges</text>
          </g>
          <!-- Loop back arrow -->
          <path d="M580,200 Q580,270 320,270 Q60,270 60,200" fill="none" stroke="#6B2FE6" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#a1)"/>
          <text x="320" y="295" text-anchor="middle" font-size="11" font-style="italic" fill="#6B2FE6" font-weight="600">cycle begins again — adult lays new eggs</text>
        </svg>`}
      />
    ),
  },
  {
    id: "t1-proc-2",
    category: "Task 1",
    subtype: "Process Diagram",
    minWords: 150,
    prompt: `The diagram below shows the main stages in the production of chocolate from cocoa beans.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="How chocolate is produced from cocoa beans"
        svg={`<svg viewBox="0 0 640 360" style="width:100%;max-width:640px" xmlns="http://www.w3.org/2000/svg">
          <defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#1E2155"/></marker></defs>
          <!-- Step 1: Cocoa tree / pods -->
          <g transform="translate(20,30)">
            <rect x="40" y="60" width="10" height="50" fill="#78350F"/>
            <circle cx="45" cy="40" r="28" fill="#10B981"/>
            <ellipse cx="30" cy="80" rx="6" ry="12" fill="#F59E0B" stroke="#7C2D12"/>
            <ellipse cx="60" cy="85" rx="6" ry="12" fill="#F59E0B" stroke="#7C2D12"/>
            <text x="50" y="135" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">1. Harvest</text>
            <text x="50" y="150" text-anchor="middle" font-size="10" fill="#64748b">cocoa pods picked</text>
          </g>
          <line x1="125" y1="90" x2="165" y2="90" stroke="#1E2155" stroke-width="2" marker-end="url(#a2)"/>
          <!-- Step 2: Ferment -->
          <g transform="translate(170,30)">
            <rect x="20" y="50" width="70" height="55" fill="#F59E0B" stroke="#78350F" stroke-width="1.5"/>
            <rect x="25" y="55" width="60" height="5" fill="#78350F"/>
            <circle cx="35" cy="75" r="3" fill="#78350F"/><circle cx="50" cy="80" r="3" fill="#78350F"/><circle cx="65" cy="72" r="3" fill="#78350F"/><circle cx="75" cy="85" r="3" fill="#78350F"/>
            <text x="55" y="135" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">2. Ferment</text>
            <text x="55" y="150" text-anchor="middle" font-size="10" fill="#64748b">beans fermented 6 days</text>
          </g>
          <line x1="280" y1="90" x2="320" y2="90" stroke="#1E2155" stroke-width="2" marker-end="url(#a2)"/>
          <!-- Step 3: Dry -->
          <g transform="translate(325,30)">
            <circle cx="55" cy="40" r="18" fill="#FBBF24"/>
            <line x1="55" y1="15" x2="55" y2="20" stroke="#FBBF24" stroke-width="2"/>
            <line x1="55" y1="60" x2="55" y2="65" stroke="#FBBF24" stroke-width="2"/>
            <line x1="25" y1="40" x2="30" y2="40" stroke="#FBBF24" stroke-width="2"/>
            <line x1="80" y1="40" x2="85" y2="40" stroke="#FBBF24" stroke-width="2"/>
            <rect x="25" y="80" width="60" height="25" fill="#78350F"/>
            <circle cx="40" cy="92" r="3" fill="#422006"/><circle cx="55" cy="92" r="3" fill="#422006"/><circle cx="70" cy="92" r="3" fill="#422006"/>
            <text x="55" y="135" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">3. Dry</text>
            <text x="55" y="150" text-anchor="middle" font-size="10" fill="#64748b">sun-dried for 1 week</text>
          </g>
          <line x1="435" y1="90" x2="475" y2="90" stroke="#1E2155" stroke-width="2" marker-end="url(#a2)"/>
          <!-- Step 4: Roast -->
          <g transform="translate(480,30)">
            <rect x="20" y="50" width="70" height="55" rx="8" fill="#EF4444" stroke="#7C2D12"/>
            <path d="M30,55 Q35,40 42,55 Q49,40 56,55 Q63,40 70,55" stroke="#FBBF24" stroke-width="2" fill="none"/>
            <rect x="32" y="75" width="46" height="20" fill="#78350F"/>
            <text x="55" y="135" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">4. Roast</text>
            <text x="55" y="150" text-anchor="middle" font-size="10" fill="#64748b">at 120°C</text>
          </g>
          <!-- Row 2 flow down-left -->
          <path d="M535,170 Q535,200 490,200" stroke="#1E2155" stroke-width="2" fill="none" marker-end="url(#a2)"/>
          <!-- Step 5: Grind -->
          <g transform="translate(380,180)">
            <polygon points="30,0 80,0 90,50 20,50" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
            <rect x="40" y="50" width="30" height="20" fill="#422006"/>
            <text x="55" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">5. Grind</text>
            <text x="55" y="110" text-anchor="middle" font-size="10" fill="#64748b">beans → cocoa paste</text>
          </g>
          <line x1="375" y1="210" x2="335" y2="210" stroke="#1E2155" stroke-width="2" marker-end="url(#a2)"/>
          <!-- Step 6: Mix -->
          <g transform="translate(230,180)">
            <rect x="20" y="10" width="70" height="55" rx="6" fill="#D97706" stroke="#78350F"/>
            <circle cx="55" cy="38" r="14" fill="#FBBF24"/>
            <text x="55" y="42" text-anchor="middle" font-size="16" fill="#78350F">+</text>
            <text x="55" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">6. Mix</text>
            <text x="55" y="110" text-anchor="middle" font-size="10" fill="#64748b">add sugar &amp; milk</text>
          </g>
          <line x1="225" y1="210" x2="185" y2="210" stroke="#1E2155" stroke-width="2" marker-end="url(#a2)"/>
          <!-- Step 7: Mould -->
          <g transform="translate(80,180)">
            <rect x="20" y="20" width="80" height="40" fill="#78350F" stroke="#422006" stroke-width="1.5"/>
            <line x1="40" y1="20" x2="40" y2="60" stroke="#422006"/>
            <line x1="60" y1="20" x2="60" y2="60" stroke="#422006"/>
            <line x1="80" y1="20" x2="80" y2="60" stroke="#422006"/>
            <text x="60" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2155">7. Mould &amp; cool</text>
            <text x="60" y="110" text-anchor="middle" font-size="10" fill="#64748b">poured into bars</text>
          </g>
        </svg>`}
      />
    ),
  },
  {
    id: "t1-proc-3",
    category: "Task 1",
    subtype: "Process Diagram",
    minWords: 150,
    prompt: `The diagram below shows a rainwater harvesting system used in a domestic house.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="A domestic rainwater harvesting system"
        svg={`<svg viewBox="0 0 640 360" style="width:100%;max-width:640px" xmlns="http://www.w3.org/2000/svg">
          <defs><marker id="a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#6B2FE6"/></marker></defs>
          <!-- Rain -->
          ${Array.from({ length: 18 }, (_, i) => `<line x1="${60 + i * 15}" y1="20" x2="${54 + i * 15}" y2="40" stroke="#6B2FE6" stroke-width="1.6"/>`).join("")}
          <text x="320" y="14" text-anchor="middle" font-size="11" font-style="italic" fill="#6B2FE6" font-weight="700">Rainwater falls on roof</text>
          <!-- House -->
          <polygon points="150,110 320,50 490,110" fill="#DC2626" stroke="#7C2D12" stroke-width="1.5"/>
          <rect x="170" y="110" width="300" height="160" fill="#FEF3C7" stroke="#78350F" stroke-width="1.5"/>
          <rect x="210" y="160" width="50" height="60" fill="#93C5FD" stroke="#1e40af"/>
          <rect x="380" y="160" width="50" height="60" fill="#93C5FD" stroke="#1e40af"/>
          <rect x="295" y="200" width="50" height="70" fill="#78350F"/>
          <!-- Gutter & downpipe -->
          <rect x="140" y="108" width="15" height="6" fill="#64748b"/>
          <rect x="140" y="114" width="8" height="140" fill="#64748b"/>
          <text x="110" y="180" text-anchor="middle" font-size="10" fill="#1E2155" font-weight="600">Gutter &amp;</text>
          <text x="110" y="194" text-anchor="middle" font-size="10" fill="#1E2155" font-weight="600">downpipe</text>
          <!-- Filter -->
          <rect x="130" y="254" width="30" height="20" fill="#F59E0B" stroke="#78350F"/>
          <text x="145" y="290" text-anchor="middle" font-size="10" fill="#1E2155" font-weight="600">Filter</text>
          <!-- Underground storage tank -->
          <rect x="80" y="295" width="180" height="50" rx="4" fill="#94A3B8" stroke="#0f172a" stroke-width="1.5"/>
          <rect x="85" y="310" width="170" height="32" fill="#60A5FA"/>
          <text x="170" y="330" text-anchor="middle" font-size="11" font-weight="700" fill="white">Underground storage tank</text>
          <!-- Pipe to house -->
          <path d="M260,320 L340,320 L340,250" fill="none" stroke="#64748b" stroke-width="4" marker-end="url(#a3)"/>
          <text x="345" y="300" font-size="10" fill="#1E2155" font-weight="600">Pump delivers</text>
          <text x="345" y="314" font-size="10" fill="#1E2155" font-weight="600">water to taps</text>
          <!-- Overflow -->
          <path d="M260,300 L300,300" fill="none" stroke="#64748b" stroke-width="3" marker-end="url(#a3)"/>
          <text x="265" y="293" font-size="9" fill="#64748b" font-style="italic">overflow to drain</text>
          <!-- In-house uses -->
          <text x="540" y="140" font-size="11" font-weight="700" fill="#1E2155">Used for:</text>
          <text x="540" y="158" font-size="10" fill="#334155">• Toilet flushing</text>
          <text x="540" y="174" font-size="10" fill="#334155">• Washing machine</text>
          <text x="540" y="190" font-size="10" fill="#334155">• Garden watering</text>
        </svg>`}
      />
    ),
  },
  // --- MAPS (3) ---
  {
    id: "t1-map-1",
    category: "Task 1",
    subtype: "Map",
    minWords: 150,
    prompt: `The maps below show the centre of a small town called Meadowford in 1995 and in 2025.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="Meadowford town centre, 1995 and 2025"
        svg={`<svg viewBox="0 0 680 340" style="width:100%;max-width:680px" xmlns="http://www.w3.org/2000/svg">
          <!-- 1995 -->
          <g transform="translate(10,10)">
            <rect x="0" y="0" width="320" height="310" fill="#F8FAFC" stroke="#1E2155" stroke-width="1.5"/>
            <text x="160" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">1995</text>
            <!-- roads -->
            <rect x="0" y="140" width="320" height="24" fill="#CBD5E1"/>
            <rect x="150" y="30" width="24" height="280" fill="#CBD5E1"/>
            <text x="80" y="158" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">Main Road</text>
            <!-- NW: park -->
            <rect x="15" y="40" width="125" height="90" fill="#86EFAC" stroke="#166534"/>
            <text x="77" y="90" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">Park</text>
            <!-- NE: cinema -->
            <rect x="185" y="40" width="125" height="90" fill="#FDE68A" stroke="#92400E"/>
            <text x="247" y="90" text-anchor="middle" font-size="11" font-weight="700" fill="#92400E">Cinema</text>
            <!-- SW: houses -->
            <rect x="15" y="180" width="125" height="115" fill="#FECACA" stroke="#991B1B"/>
            <text x="77" y="235" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">Houses</text>
            <!-- SE: farmland -->
            <rect x="185" y="180" width="125" height="115" fill="#D9F99D" stroke="#3F6212"/>
            <text x="247" y="235" text-anchor="middle" font-size="11" font-weight="700" fill="#3F6212">Farmland</text>
            <!-- river -->
            <path d="M15,290 Q80,280 150,295 Q220,305 310,285" fill="none" stroke="#60A5FA" stroke-width="4"/>
            <text x="50" y="278" font-size="9" fill="#1e40af" font-style="italic">River</text>
          </g>
          <!-- 2025 -->
          <g transform="translate(350,10)">
            <rect x="0" y="0" width="320" height="310" fill="#F8FAFC" stroke="#1E2155" stroke-width="1.5"/>
            <text x="160" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">2025</text>
            <rect x="0" y="140" width="320" height="24" fill="#CBD5E1"/>
            <rect x="150" y="30" width="24" height="280" fill="#CBD5E1"/>
            <text x="80" y="158" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">Main Road</text>
            <!-- NW: park (same) -->
            <rect x="15" y="40" width="125" height="90" fill="#86EFAC" stroke="#166534"/>
            <text x="77" y="90" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">Park</text>
            <!-- NE: shopping mall (replaced cinema) -->
            <rect x="185" y="40" width="125" height="90" fill="#C7D2FE" stroke="#3730A3"/>
            <text x="247" y="85" text-anchor="middle" font-size="10" font-weight="700" fill="#3730A3">Shopping</text>
            <text x="247" y="100" text-anchor="middle" font-size="10" font-weight="700" fill="#3730A3">Mall</text>
            <!-- SW: apartments (replaced houses) -->
            <rect x="15" y="180" width="125" height="115" fill="#FDBA74" stroke="#9A3412"/>
            <text x="77" y="225" text-anchor="middle" font-size="10" font-weight="700" fill="#9A3412">Apartment</text>
            <text x="77" y="240" text-anchor="middle" font-size="10" font-weight="700" fill="#9A3412">Blocks</text>
            <!-- SE: car park (new) -->
            <rect x="185" y="180" width="125" height="115" fill="#E5E7EB" stroke="#374151"/>
            ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => `<rect x="${195 + c * 28}" y="${190 + r * 24}" width="22" height="18" fill="#F8FAFC" stroke="#374151"/>`).join("")).join("")}
            <text x="247" y="240" text-anchor="middle" font-size="10" font-weight="700" fill="#374151">Car Park</text>
            <!-- river -->
            <path d="M15,290 Q80,280 150,295 Q220,305 310,285" fill="none" stroke="#60A5FA" stroke-width="4"/>
          </g>
        </svg>`}
      />
    ),
  },
  {
    id: "t1-map-2",
    category: "Task 1",
    subtype: "Map",
    minWords: 150,
    prompt: `The first map below shows Greenhill Public Park as it is today. The second map shows a proposed development plan for the park.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="Greenhill Park: current layout and proposed development"
        svg={`<svg viewBox="0 0 680 340" style="width:100%;max-width:680px" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(10,10)">
            <rect x="0" y="0" width="320" height="310" fill="#DCFCE7" stroke="#166534" stroke-width="1.5"/>
            <text x="160" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">Greenhill Park — Now</text>
            <!-- path -->
            <path d="M0,160 Q80,140 160,170 Q240,200 320,160" fill="none" stroke="#A16207" stroke-width="8"/>
            <text x="80" y="150" font-size="10" fill="#78350F" font-weight="600">Walking path</text>
            <!-- pond -->
            <ellipse cx="90" cy="90" rx="50" ry="30" fill="#60A5FA" stroke="#1e40af"/>
            <text x="90" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="white">Pond</text>
            <!-- trees -->
            <g fill="#166534"><circle cx="220" cy="70" r="14"/><circle cx="250" cy="90" r="14"/><circle cx="200" cy="100" r="14"/><circle cx="260" cy="60" r="14"/></g>
            <text x="230" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#166534">Trees</text>
            <!-- grass -->
            <text x="70" y="245" text-anchor="middle" font-size="10" fill="#3F6212" font-style="italic">open grass</text>
            <text x="240" y="245" text-anchor="middle" font-size="10" fill="#3F6212" font-style="italic">open grass</text>
            <!-- entrance -->
            <polygon points="150,300 170,300 160,310" fill="#1E2155"/>
            <text x="160" y="295" text-anchor="middle" font-size="9" fill="#1E2155" font-weight="600">Entrance</text>
          </g>
          <g transform="translate(350,10)">
            <rect x="0" y="0" width="320" height="310" fill="#DCFCE7" stroke="#166534" stroke-width="1.5"/>
            <text x="160" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">Greenhill Park — Proposed</text>
            <!-- path (paved, new loop) -->
            <path d="M0,160 Q80,140 160,170 Q240,200 320,160" fill="none" stroke="#64748b" stroke-width="8"/>
            <path d="M160,170 Q160,240 90,240 Q60,240 60,210" fill="none" stroke="#64748b" stroke-width="6"/>
            <!-- pond kept -->
            <ellipse cx="90" cy="90" rx="50" ry="30" fill="#60A5FA" stroke="#1e40af"/>
            <text x="90" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="white">Pond</text>
            <!-- trees area reduced, café added NE -->
            <rect x="210" y="45" width="80" height="55" fill="#FDE68A" stroke="#92400E"/>
            <text x="250" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="#92400E">Café</text>
            <!-- playground SW -->
            <rect x="20" y="230" width="90" height="65" fill="#FDBA74" stroke="#9A3412"/>
            <text x="65" y="267" text-anchor="middle" font-size="10" font-weight="700" fill="#9A3412">Playground</text>
            <!-- sports court SE -->
            <rect x="190" y="230" width="110" height="65" fill="#C7D2FE" stroke="#3730A3"/>
            <text x="245" y="267" text-anchor="middle" font-size="10" font-weight="700" fill="#3730A3">Sports Court</text>
            <!-- car park top-left -->
            <rect x="20" y="40" width="50" height="40" fill="#E5E7EB" stroke="#374151"/>
            <text x="45" y="65" text-anchor="middle" font-size="9" font-weight="700" fill="#374151">Parking</text>
            <polygon points="150,300 170,300 160,310" fill="#1E2155"/>
          </g>
        </svg>`}
      />
    ),
  },
  {
    id: "t1-map-3",
    category: "Task 1",
    subtype: "Map",
    minWords: 150,
    prompt: `The maps below show the layout of Westbrook Primary School in 2000 and its redevelopment in 2024.\n\n${TASK1_INSTRUCTION}`,
    visual: (
      <RawSvg
        title="Westbrook Primary School, 2000 vs 2024"
        svg={`<svg viewBox="0 0 680 340" style="width:100%;max-width:680px" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(10,10)">
            <rect x="0" y="0" width="320" height="310" fill="#F8FAFC" stroke="#1E2155" stroke-width="1.5"/>
            <text x="160" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">2000</text>
            <rect x="20" y="40" width="130" height="80" fill="#FECACA" stroke="#991B1B"/>
            <text x="85" y="85" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">Classrooms</text>
            <rect x="170" y="40" width="130" height="80" fill="#FED7AA" stroke="#9A3412"/>
            <text x="235" y="85" text-anchor="middle" font-size="11" font-weight="700" fill="#9A3412">Library</text>
            <rect x="20" y="140" width="280" height="100" fill="#D9F99D" stroke="#3F6212"/>
            <text x="160" y="195" text-anchor="middle" font-size="12" font-weight="700" fill="#3F6212">Playground</text>
            <rect x="20" y="255" width="280" height="45" fill="#CBD5E1" stroke="#475569"/>
            <text x="160" y="282" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Car Park</text>
          </g>
          <g transform="translate(350,10)">
            <rect x="0" y="0" width="320" height="310" fill="#F8FAFC" stroke="#1E2155" stroke-width="1.5"/>
            <text x="160" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#1E2155">2024</text>
            <rect x="20" y="40" width="280" height="60" fill="#FECACA" stroke="#991B1B"/>
            <text x="160" y="75" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">New Classroom Block (expanded)</text>
            <rect x="20" y="115" width="130" height="70" fill="#FED7AA" stroke="#9A3412"/>
            <text x="85" y="145" text-anchor="middle" font-size="10" font-weight="700" fill="#9A3412">Library</text>
            <text x="85" y="160" text-anchor="middle" font-size="10" font-weight="700" fill="#9A3412">&amp; IT Lab</text>
            <rect x="170" y="115" width="130" height="70" fill="#C7D2FE" stroke="#3730A3"/>
            <text x="235" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="#3730A3">Sports Hall</text>
            <text x="235" y="162" text-anchor="middle" font-size="9" fill="#3730A3">(new)</text>
            <rect x="20" y="200" width="180" height="90" fill="#D9F99D" stroke="#3F6212"/>
            <text x="110" y="248" text-anchor="middle" font-size="11" font-weight="700" fill="#3F6212">Playground</text>
            <rect x="215" y="200" width="85" height="45" fill="#86EFAC" stroke="#166534"/>
            <text x="257" y="227" text-anchor="middle" font-size="9" font-weight="700" fill="#166534">Garden</text>
            <rect x="215" y="250" width="85" height="40" fill="#CBD5E1" stroke="#475569"/>
            <text x="257" y="275" text-anchor="middle" font-size="9" font-weight="700" fill="#475569">Car Park</text>
          </g>
        </svg>`}
      />
    ),
  },
];

// ══════════════════════════════════════════════════════════
// TASK 2 ASSIGNMENTS (15)
// ══════════════════════════════════════════════════════════

const TASK2_INSTRUCTION = "You should spend about 40 minutes on this task. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.";

const TASK2: Assignment[] = [
  {
    id: "t2-op-1", category: "Task 2", subtype: "Opinion",
    minWords: 250,
    prompt: `Some people believe that children should be required to study a foreign language from the age of five, while others think language learning should begin in secondary school.\n\nTo what extent do you agree or disagree?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-op-2", category: "Task 2", subtype: "Opinion",
    minWords: 250,
    prompt: `In many countries, working from home has become much more common since 2020.\n\nSome people believe this trend has a positive effect on workers and society, while others argue the opposite.\n\nDo the benefits of working from home outweigh the drawbacks?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-op-3", category: "Task 2", subtype: "Opinion",
    minWords: 250,
    prompt: `Some people think that the government should be responsible for funding scientific research, while others believe private companies should pay for it.\n\nDiscuss both views and give your own opinion.\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-op-4", category: "Task 2", subtype: "Opinion",
    minWords: 250,
    prompt: `"Success in life comes from hard work and determination, not from natural ability."\n\nTo what extent do you agree or disagree with this statement?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-disc-1", category: "Task 2", subtype: "Discussion",
    minWords: 250,
    prompt: `Some people believe that the best way to reduce traffic congestion in cities is to invest in public transport. Others argue that limiting private car use is more effective.\n\nDiscuss both views and give your own opinion.\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-disc-2", category: "Task 2", subtype: "Discussion",
    minWords: 250,
    prompt: `Some people argue that university students should focus only on subjects that will help them find a job. Others believe students should be free to study any subject that interests them.\n\nDiscuss both views and give your own opinion.\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-disc-3", category: "Task 2", subtype: "Discussion",
    minWords: 250,
    prompt: `Some people think that children learn best from their parents. Others believe teachers have a greater influence on a child's development.\n\nDiscuss both views and give your own opinion.\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-disc-4", category: "Task 2", subtype: "Discussion",
    minWords: 250,
    prompt: `Some people believe that international tourism brings valuable economic benefits to developing countries. Others feel it causes more harm than good.\n\nDiscuss both views and give your own opinion.\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ps-1", category: "Task 2", subtype: "Problem / Solution",
    minWords: 250,
    prompt: `In many countries, large amounts of food are wasted every day by supermarkets, restaurants and households.\n\nWhat are the main causes of this problem, and what solutions can you suggest?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ps-2", category: "Task 2", subtype: "Problem / Solution",
    minWords: 250,
    prompt: `Obesity rates among young people have increased dramatically in many countries over the past twenty years.\n\nWhat are the reasons for this trend, and what can be done to address it?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ps-3", category: "Task 2", subtype: "Problem / Solution",
    minWords: 250,
    prompt: `Many people now spend a significant amount of their daily life on social media, and this is having a negative effect on mental health.\n\nWhat are the causes of this problem, and what measures could individuals and governments take to solve it?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ps-4", category: "Task 2", subtype: "Problem / Solution",
    minWords: 250,
    prompt: `In many large cities around the world, air pollution has reached dangerous levels.\n\nWhat are the main causes, and what can be done to reduce air pollution?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ad-1", category: "Task 2", subtype: "Advantages / Disadvantages",
    minWords: 250,
    prompt: `In some countries, young adults are encouraged to take a gap year between finishing school and beginning university.\n\nDo the advantages of taking a gap year outweigh the disadvantages?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ad-2", category: "Task 2", subtype: "Advantages / Disadvantages",
    minWords: 250,
    prompt: `More and more people are choosing to live in mega-cities with populations of over ten million.\n\nWhat are the advantages and disadvantages of this trend?\n\n${TASK2_INSTRUCTION}`,
  },
  {
    id: "t2-ad-3", category: "Task 2", subtype: "Advantages / Disadvantages",
    minWords: 250,
    prompt: `Some countries are introducing laws that limit the number of hours children can spend using electronic devices each day.\n\nWhat are the advantages and disadvantages of such laws?\n\n${TASK2_INSTRUCTION}`,
  },
];

// ══════════════════════════════════════════════════════════
// PARAGRAPH ASSIGNMENTS (15) — real-life writing
// ══════════════════════════════════════════════════════════

const PARA: Assignment[] = [
  {
    id: "p-1", category: "Paragraph", subtype: "Informal Email",
    minWords: 80,
    context: "You haven't seen your best friend in almost a year because they moved to another country.",
    prompt: `Write a short informal email to your best friend. In your email:\n\n• Tell them what you have been up to recently\n• Ask about their new life abroad\n• Suggest a time you could video-call or meet up`,
  },
  {
    id: "p-2", category: "Paragraph", subtype: "Formal Letter",
    minWords: 100,
    context: "You are applying to study a Master's degree at a UK university.",
    prompt: `Write a formal letter to the university admissions office. In your letter:\n\n• Introduce yourself briefly\n• Explain why you want to study at this university\n• Ask about scholarship opportunities and application deadlines`,
  },
  {
    id: "p-3", category: "Paragraph", subtype: "Complaint Letter",
    minWords: 100,
    context: "You recently bought a laptop online, but it arrived damaged and stopped working after two days.",
    prompt: `Write a formal complaint letter to the online shop. In your letter:\n\n• Describe what you bought and when\n• Explain what is wrong with the product\n• Say what action you want them to take (refund, replacement, etc.)`,
  },
  {
    id: "p-4", category: "Paragraph", subtype: "Informal Message",
    minWords: 60,
    context: "Your colleague is sick at home today.",
    prompt: `Write a short, friendly message to your colleague. Include:\n\n• How you feel about their absence\n• An offer to help them with work\n• A wish for a quick recovery`,
  },
  {
    id: "p-5", category: "Paragraph", subtype: "Formal Letter",
    minWords: 100,
    context: "You want to invite an important client to a business dinner next Friday.",
    prompt: `Write a formal invitation letter. Include:\n\n• The date, time and venue\n• The reason for the dinner\n• A polite request for their confirmation`,
  },
  {
    id: "p-6", category: "Paragraph", subtype: "Informal Email",
    minWords: 80,
    context: "Your cousin is getting married next month and has invited you to the wedding abroad.",
    prompt: `Write a reply email to your cousin. In your email:\n\n• Congratulate them on the news\n• Confirm whether you can attend\n• Ask practical questions about travel and accommodation`,
  },
  {
    id: "p-7", category: "Paragraph", subtype: "Complaint Letter",
    minWords: 100,
    context: "You stayed at a hotel for three nights, but the room was dirty, noisy and the staff were rude.",
    prompt: `Write a formal letter of complaint to the hotel manager. Include:\n\n• The dates you stayed and your room number\n• The specific problems you experienced\n• What compensation you expect`,
  },
  {
    id: "p-8", category: "Paragraph", subtype: "Thank-you Note",
    minWords: 70,
    context: "A former teacher helped you prepare for an important exam you recently passed.",
    prompt: `Write a short thank-you note to your former teacher. Include:\n\n• The good news about your exam\n• What exactly they did that helped you\n• A warm closing line`,
  },
  {
    id: "p-9", category: "Paragraph", subtype: "Formal Letter",
    minWords: 100,
    context: "You work full-time and want to take two weeks off in August to travel.",
    prompt: `Write a formal letter to your manager requesting leave. Include:\n\n• The exact dates you want to take off\n• Your reason for the request\n• How you will cover your work during your absence`,
  },
  {
    id: "p-10", category: "Paragraph", subtype: "Informal Email",
    minWords: 80,
    context: "A friend is visiting your city for the first time next weekend.",
    prompt: `Write an email to your friend recommending things to do. Include:\n\n• Two places they should definitely visit\n• A local food they should try\n• An offer to show them around personally`,
  },
  {
    id: "p-11", category: "Paragraph", subtype: "Apology Message",
    minWords: 70,
    context: "You missed an important meeting with a classmate because you overslept.",
    prompt: `Write a short apology message to your classmate. Include:\n\n• A clear apology\n• A brief, honest explanation\n• A concrete suggestion to make up for it`,
  },
  {
    id: "p-12", category: "Paragraph", subtype: "Formal Letter",
    minWords: 100,
    context: "You are applying for a part-time job at a local bookshop.",
    prompt: `Write a formal cover letter. Include:\n\n• The position you are applying for\n• Why you are a good fit for the job\n• Your availability and how to contact you`,
  },
  {
    id: "p-13", category: "Paragraph", subtype: "Informal Email",
    minWords: 80,
    context: "Your friend just started a new job and is feeling nervous.",
    prompt: `Write a supportive email to your friend. Include:\n\n• Encouraging words about their new role\n• Advice based on your own experience\n• An offer to meet up and talk`,
  },
  {
    id: "p-14", category: "Paragraph", subtype: "Complaint Letter",
    minWords: 100,
    context: "Construction work in the flat above yours starts every morning at 6 AM and is disturbing your sleep.",
    prompt: `Write a formal letter to your building manager. Include:\n\n• How the noise is affecting you\n• When exactly it happens\n• What you would like them to do about it`,
  },
  {
    id: "p-15", category: "Paragraph", subtype: "Informal Message",
    minWords: 60,
    context: "You borrowed a book from your classmate three weeks ago and haven't returned it yet.",
    prompt: `Write a short message to your classmate. Include:\n\n• An apology for keeping the book so long\n• A brief comment on the book\n• A suggestion for when and where to return it`,
  },
];

// ══════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════

export const ASSIGNMENTS: Record<AssignmentCategory, Assignment[]> = {
  "Task 1": TASK1,
  "Task 2": TASK2,
  "Paragraph": PARA,
};

export function getAssignment(category: AssignmentCategory, index: number): Assignment {
  const list = ASSIGNMENTS[category];
  return list[((index % list.length) + list.length) % list.length];
}
