import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { Lang } from "./lib/i18n";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, initialLang: "en" as Lang },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
