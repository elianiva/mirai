import { betterAuth } from "better-auth";
import "dotenv/config"; // To load .env variables

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET as string,
	emailAndPassword: {
		enabled: true,
	},
});

export type Auth = typeof auth;
