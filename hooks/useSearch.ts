import { Service } from '@/types';
import Fuse from 'fuse.js';
import { useState } from 'react';

/** Fuzzy search over services by label and issuer; an empty query returns them all. */
export function useSearch(services: Service[]) {
  const [query, setQuery] = useState('');

  const fuse = new Fuse(services, {
    isCaseSensitive: false,
    keys: ['name', 'otp.issuer'],
    distance: 0.4,
  });
  const results = query === '' ? services : fuse.search(query).map((result) => result.item);

  return { results, query, setQuery };
}
