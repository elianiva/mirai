import { useQuery } from "@tanstack/react-query";

import { queryOptions } from "@tanstack/react-query";
import { authUserFn } from "../functions/auth";

export const USER_QUERY_KEYS = {
	user: "user",
} as const;

export const userQueryOptions = queryOptions({
	queryKey: [USER_QUERY_KEYS.user],
	queryFn: async () => authUserFn({ data: { shouldRedirect: false } }),
	staleTime: 5 * 60 * 1000,
	gcTime: 10 * 60 * 1000,
	retry: 1,
	refetchOnWindowFocus: false,
	refetchOnMount: false,
});

export const useUser = () => {
	return useQuery(userQueryOptions);
};
