import {
  Radar,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export type RadarDataPoint = {
  label: string;
  fullMark: number;
  score: number;
};

export function RadarChart({ data }: { data: RadarDataPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Compatibility"
            dataKey="score"
            stroke="hsl(38 92% 50%)"
            strokeWidth={2}
            fill="hsl(38 92% 50%)"
            fillOpacity={0.25}
          />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
