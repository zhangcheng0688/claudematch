import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /match/* — the actual list lives in match.index.tsx and
// the detail page in match.$id.tsx. Without this <Outlet />, navigating to
// /match/$id rendered the parent list instead of the detail page.
export const Route = createFileRoute("/_authenticated/match")({
  component: () => <Outlet />,
});
