import { useQuery } from '@tanstack/react-query';

import { getAssessment } from '@item-bank/api';

/**
 * Fetch a single assessment by ID.
 * Disabled when id is 0 (the "new" editor state before a record exists).
 */
export function useAssessment(id: number) {
  return useQuery({
    queryKey: ['assessments', id],
    queryFn: () => getAssessment(id),
    enabled: id > 0,
  });
}
