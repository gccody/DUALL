import type { Service } from '@/types';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useState } from 'react';

const SEARCH_OPTIONS: IFuseOptions<Service> = {
  isCaseSensitive: false,
  keys: ['name', 'otp.issuer'],
  distance: 0.4,
};

/** Fuzzy search over services by name and issuer. An empty query returns all of them. */
export function useSearch(allServices: Service[]) {
  const [query, setQuery] = useState('');

  // Derived during render; React Compiler memoizes it per `allServices`/`query`.
  const services = query === ''
    ? allServices
    : new Fuse(allServices, SEARCH_OPTIONS).search(query).map((result) => result.item);

  const handleSearch = (text: string) => setQuery(text);

  return { services, handleSearch };
}
