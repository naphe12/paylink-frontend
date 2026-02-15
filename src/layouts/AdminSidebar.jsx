import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.title}>Admin</h2>

      <NavItem to="/admin" label="Dashboard" />
      <NavItem to="/admin/aml" label="AML Cases" />
      <NavItem to="/admin/risk-heatmap" label="Risk Heatmap" />
      <NavItem to="/admin/liquidity" label="Liquidity" />
      <NavItem to="/admin/arbitrage" label="Arbitrage" />
      <NavItem to="/admin/kill-switch" label="Kill Switch" danger />

      <div style={{ marginTop: "auto", fontSize: 12, color: "#888" }}>
        PayLink Admin Panel
      </div>
    </div>
  );
}

function NavItem({ to, label, danger }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.link,
        ...(isActive ? styles.active : {}),
        ...(danger ? styles.danger : {}),
      })}
    >
      {label}
    </NavLink>
  );
}

const styles = {
  sidebar: {
    width: 240,
    height: "100vh",
    background: "#111",
    color: "#fff",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  title: {
    marginBottom: 20,
  },
  link: {
    textDecoration: "none",
    color: "#ccc",
    padding: "8px 12px",
    borderRadius: 6,
  },
  active: {
    background: "#333",
    color: "#fff",
  },
  danger: {
    color: "#ff4d4f",
  },
};
