import { Navigate, useLocation } from "react-router-dom";

const ensureLeadingSlash = (value) =>
  value.startsWith("/") ? value : `/${value}`;

export default function LegacyRouteRedirect({ from, to }) {
  const location = useLocation();
  const origin = ensureLeadingSlash(from);
  const destination = ensureLeadingSlash(to);

  const pathname = location.pathname.startsWith(origin)
    ? destination + location.pathname.slice(origin.length)
    : destination;

  return (
    <Navigate
      to={`${pathname}${location.search}${location.hash}`}
      replace
    />
  );
}
