import { useQuery } from '@tanstack/react-query';
import { scriptService } from '../services/api';

// Hook to fetch a script by ID
export const useScriptById = (id: string) => {
  return useQuery({
    queryKey: ['script', id],
    queryFn: () => scriptService.getScript(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to fetch all scripts
export const useScripts = (params = {}) => {
  return useQuery({
    queryKey: ['scripts', params],
    queryFn: () => scriptService.getScripts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to search scripts
export const useScriptSearch = (query: string, filters = {}) => {
  return useQuery({
    queryKey: ['scriptSearch', query, filters],
    queryFn: () => scriptService.searchScripts(query, filters),
    enabled: !!query,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
