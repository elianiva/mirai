import { betterAuth } from "better-auth";
import "dotenv/config"; // To load .env variables

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET as string,
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
});

export type Auth = typeof auth;
