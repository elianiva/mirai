const ALGORITHM = "AES-GCM";
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const HASH_ALGORITHM = "SHA-256";
const STORAGE_KEY = "openrouter-key";

async function getKeyMaterial(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
}

async function deriveKey(keyMaterial: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: ITERATIONS,
            hash: HASH_ALGORITHM,
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encrypt(plaintext: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from password
    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        data
    );
    
    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string, password: string): Promise<string> {
    try {
        // Convert from base64
        const combined = new Uint8Array(
            atob(ciphertext)
                .split("")
                .map(char => char.charCodeAt(0))
        );
        
        // Extract salt, iv, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);
        
        // Derive key from password
        const keyMaterial = await getKeyMaterial(password);
        const key = await deriveKey(keyMaterial, salt);
        
        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv,
            },
            key,
            encrypted
        );
        
        // Convert back to string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        throw new Error("Failed to decrypt data. Invalid password or corrupted data.");
    }
}

export async function encryptAndStore(key: string, data: string): Promise<void> {
    try {
        const encrypted = await encrypt(data, key);
        localStorage.setItem(STORAGE_KEY, encrypted);
    } catch (error) {
        throw new Error("Failed to encrypt and store data.");
    }
}

export async function retrieveAndDecrypt(key: string): Promise<string | null> {
    try {
        const encrypted = localStorage.getItem(STORAGE_KEY);
        if (!encrypted) {
            return null;
        }
        
        return await decrypt(encrypted, key);
    } catch (error) {
        throw new Error("Failed to retrieve and decrypt data. Invalid password or corrupted data.");
    }
}
