import { Service } from '@/types';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from "react";

export function useSearch(initialData: Service[]) {
  const [data, setData] = useState<Service[]>(initialData);
  const [filteredServices, setFilteredServices] = useState<Service[]>(initialData);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update data when context data changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Memoize Fuse instance
  const fuse = useMemo(
    () => new Fuse(data, { 
      isCaseSensitive: false, 
      keys: ["name", "otp.issuer"], 
      distance: 0.4 
    }),
    [data]
  );

  // Update search results when query or data changes
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredServices(data);
    } else {
      const searchedData = fuse.search(searchQuery);
      setFilteredServices(searchedData.map((val) => val.item));
    }
  }, [searchQuery, data, fuse]);

  const handleSearch = (text: string) => setSearchQuery(text);

  return {
    services: filteredServices,
    search: searchQuery,
    setSearch: setSearchQuery,
    handleSearch
  };
}