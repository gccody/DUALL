import type { Service } from '@/types';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useState } from 'react';

const SEARCH_OPTIONS: IFuseOptions<Service> = {
  isCaseSensitive: false,
  keys: ['name', 'otp.issuer'],
  distance: 0.4,
};

/** Fuzzy search over services by name and issuer. An empty query returns all of them. */
export function useSearch(services: Service[]) {
  const [query, setQuery] = useState('');

  // Derived during render; React Compiler memoizes it per `services`/`query`.
  const results = query === ''
    ? services
    : new Fuse(services, SEARCH_OPTIONS).search(query).map((result) => result.item);

  return { results, query, setQuery };
}
