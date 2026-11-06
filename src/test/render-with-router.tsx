import type { ReactNode } from "react";
import { act, render } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

export async function renderWithRouter(element: ReactNode) {
  const root = createRootRoute({ component: () => element });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(() => router.load());
  return render(<RouterProvider router={router} />);
}
