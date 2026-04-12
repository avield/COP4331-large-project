import api from "@/api/axios";
import type { Project } from "@/routes/_workspace/home";
import { useQuery } from "@tanstack/react-query";

export function useRecentProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get<Project[]>('/projects'); // ?sort=updatedAtDescending&limit=5 if in the future we add these options to backend
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // considers data fresh for  every 5 minutes (if it's not then it refetches)
  });
}