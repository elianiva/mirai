function loadFromLocalStorage<T>(key: string): T | undefined {
	try {
		const item = localStorage.getItem(key);
		if (item === null) {
			return undefined;
		}
		return JSON.parse(item) as T;
	} catch (error) {
		// TODO: this is annoying, but could be useful for debugging
		// console.warn(
		// 	`Failed to load data from localStorage for key "${key}":`,
		// 	error,
		// );
		return undefined;
	}
}

function saveToLocalStorage<T>(key: string, data: T): void {
	try {
		const serializedData = JSON.stringify(data);
		localStorage.setItem(key, serializedData);
	} catch (error) {
		console.warn(
			`Failed to save data to localStorage for key "${key}":`,
			error,
		);
	}
}

export { loadFromLocalStorage, saveToLocalStorage };
