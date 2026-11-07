import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

// Thin wrapper around React Query so every existing caller keeps the exact
// same { data, loading, error, reload } shape it already destructures — but
// now backed by a shared cache keyed on `path`: two components requesting
// the same endpoint (e.g. a page's own '/complaints' fetch and the sidebar's
// notification poll) share one network request/result instead of each
// firing its own.
export function useApiData(path, { initial = [] } = {}) {
  const query = useQuery({
    queryKey: [path],
    queryFn: async () => {
      const r = await api(path)
      return r.data ?? initial
    },
  })

  return {
    data: query.data ?? initial,
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  }
}
