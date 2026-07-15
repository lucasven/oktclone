import { queryOptions, useQuery } from '@tanstack/react-query'

import { getMe } from '../lib/auth'

export const meQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: getMe,
})

export function useMe() {
  return useQuery(meQueryOptions)
}
