export const CORS_HEADERS = new Headers({
	"Access-Control-Allow-Origin": "https://mirai.elianiva.my.id",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers":
		"Content-Type, Authorization, X-Requested-With, Accept, Origin, Digest",
	"Access-Control-Max-Age": "86400",
	Vary: "origin",
});
