import { QueryClient } from '@tanstack/react-query'

// Shared cache for every useQuery in the app, in its own module (rather than
// created inline in main.jsx) so non-React code — notably the api() helper —
// can invalidate entries after a mutation.
//
// staleTime is how long a cached result is served as-is before a remount or
// window refocus triggers a background refetch; retry is capped at 1 because
// React Query's default of 3 just wastes calls on non-transient failures
// like an auth error.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
