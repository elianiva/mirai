import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import CryptoJS from "crypto-js";

function encryptApiKey(apiKey: string): {
	encryptedApiKey: string;
	iv: string;
} {
	const secretKey = process.env.CONVEX_AES_SECRET_KEY;
	if (!secretKey) {
		throw new Error("Encryption secret key is not available");
	}

	const iv = CryptoJS.lib.WordArray.random(16);

	const encrypted = CryptoJS.AES.encrypt(apiKey, secretKey, {
		iv: iv,
	});

	return {
		encryptedApiKey: encrypted.toString(),
		iv: iv.toString(CryptoJS.enc.Base64),
	};
}

function decryptApiKey(encryptedApiKey: string, iv: string): string {
	const secretKey = process.env.CONVEX_AES_SECRET_KEY;
	if (!secretKey) {
		throw new Error("Encryption secret key is not available");
	}

	const decrypted = CryptoJS.AES.decrypt(encryptedApiKey, secretKey, {
		iv: CryptoJS.enc.Base64.parse(iv),
	});

	return decrypted.toString(CryptoJS.enc.Utf8);
}

export const getOpenrouterSettings = query({
	args: {},
	handler: async (ctx) => {
		const settings = await ctx.db.query("openrouterSettings").first();

		if (!settings) {
			return null;
		}

		try {
			const apiKey = decryptApiKey(settings.encryptedApiKey, settings.iv);

			return { apiKey };
		} catch (error) {
			console.error("Error decrypting API key:", error);
			throw new Error("Failed to decrypt the API key");
		}
	},
});

export const updateOpenrouterSettings = mutation({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			const { encryptedApiKey, iv } = encryptApiKey(args.apiKey);

			const existingSettings = await ctx.db.query("openrouterSettings").first();

			if (existingSettings) {
				await ctx.db.patch(existingSettings._id, { encryptedApiKey, iv });
				return {
					message: "OpenRouter API key settings updated successfully",
					data: { apiKey: args.apiKey },
				};
			}

			await ctx.db.insert("openrouterSettings", { encryptedApiKey, iv });
			return {
				message: "OpenRouter API key settings created successfully",
				data: { apiKey: args.apiKey },
			};
		} catch (error) {
			console.error("Error encrypting API key:", error);
			throw new Error("Failed to encrypt and save the API key");
		}
	},
});
