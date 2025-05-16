import { useQuery } from "@tanstack/react-query";

import { queryOptions } from "@tanstack/react-query";
import { authStateFn } from "../functions/auth";

export const USER_QUERY_KEYS = {
	user: "user",
} as const;

export const userQueryOptions = queryOptions({
	queryKey: [USER_QUERY_KEYS.user],
	queryFn: async () => authStateFn(),
});

export const useUser = () => {
	return useQuery(userQueryOptions);
};
