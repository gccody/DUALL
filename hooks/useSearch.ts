import { Service } from '@/types';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from "react";

export function useSearch(initialData: Service[]) {
  const [filteredServices, setFilteredServices] = useState<Service[]>(initialData);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Memoize Fuse instance - use initialData directly
  const fuse = useMemo(
    () => new Fuse(initialData, {
      isCaseSensitive: false,
      keys: ["name", "otp.issuer"],
      distance: 0.4
    }),
    [initialData]
  );

  // Update search results when query or initialData changes
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredServices(initialData);
    } else {
      const searchedData = fuse.search(searchQuery);
      setFilteredServices(searchedData.map((val) => val.item));
    }
  }, [searchQuery, initialData, fuse]);

  const handleSearch = (text: string) => setSearchQuery(text);

  return {
    services: filteredServices,
    search: searchQuery,
    setSearch: setSearchQuery,
    handleSearch
  };
}