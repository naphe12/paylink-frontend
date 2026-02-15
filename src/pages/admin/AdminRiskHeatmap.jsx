import { useEffect, useMemo, useState } from "react";

async function api(url) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const BUCKETS = ["0-19", "20-39", "40-59", "60-79", "80-100"];

export default function AdminRiskHeatmap() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api("/api/admin/dashboard/risk-heatmap?days=14").then(setRows);
  }, []);

  const days = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.day)));
    return Array.from(set).sort();
  }, [rows]);

  const map = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(`${r.day}|${r.bucket}`, Number(r.cnt));
    return m;
  }, [rows]);

  const max = useMemo(() => {
    let mx = 1;
    rows.forEach((r) => {
      if (Number(r.cnt) > mx) mx = Number(r.cnt);
    });
    return mx;
  }, [rows]);

  const intensity = (v) => {
    const x = v / max;
    const alpha = 0.1 + 0.8 * x;
    return `rgba(0,0,0,${alpha})`;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Risk Heatmap (14 days)</h2>

      <div style={{ overflowX: "auto" }}>
        <table cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Bucket</th>
              {days.map((d) => (
                <th key={d} style={th}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((b) => (
              <tr key={b}>
                <td style={td}>
                  <b>{b}</b>
                </td>
                {days.map((d) => {
                  const v = map.get(`${d}|${b}`) || 0;
                  return (
                    <td
                      key={d}
                      style={{ ...td, background: intensity(v), color: v > 0 ? "#fff" : "#111" }}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10, color: "#666" }}>
        Plus la case est sombre, plus il y a de trades dans cette tranche de risque.
      </p>
    </div>
  );
}

const th = { border: "1px solid #eee", background: "#fafafa", position: "sticky", top: 0 };
const td = { border: "1px solid #eee", textAlign: "center", minWidth: 72 };
