import type { Service } from '@/types';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useState } from 'react';

const SEARCH_OPTIONS: IFuseOptions<Service> = {
  isCaseSensitive: false,
  keys: ['name', 'otp.issuer'],
  threshold: 0.4,
};

/** Fuzzy search over services by name and issuer. An empty query returns all of them. */
export function searchServices(services: Service[], query: string): Service[] {
  if (query === '') return services;
  return new Fuse(services, SEARCH_OPTIONS).search(query).map((result) => result.item);
}

/** Search state over services; results come from searchServices. */
export function useSearch(services: Service[]) {
  const [query, setQuery] = useState('');

  // Derived during render; React Compiler memoizes it per `services`/`query`.
  const results = searchServices(services, query);

  return { results, query, setQuery };
}
