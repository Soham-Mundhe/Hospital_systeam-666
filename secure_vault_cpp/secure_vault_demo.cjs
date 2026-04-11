const crypto = require('crypto');

console.log("========================================");
console.log(" SECURE HOSPITAL DIGITAL VAULT PROTOTYPE");
console.log("========================================\n");

// --- HELPER: Print Hex Snippet ---
function printHexSnippet(title, buffer) {
    console.log(`=== ${title} ===`);
    console.log(`Length: ${buffer.length} bytes`);
    let hexStr = buffer.slice(0, 32).toString('hex').match(/.{1,2}/g).join(' ');
    if (buffer.length > 32) hexStr += ' ...';
    console.log(hexStr + "\n");
}

// ==========================================
// MODULE A: CRYPTO ENGINE
// ==========================================
class CryptoEngine {
    static generateRSAKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
    }

    static rsaEncrypt(dataBuffer, publicKey) {
        return crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        }, dataBuffer);
    }

    static rsaDecrypt(encryptedBuffer, privateKey) {
        return crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        }, encryptedBuffer);
    }

    static deriveKeyWithPBKDF2(password, saltBuffer) {
        return crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
    }

    static aesEncrypt(dataBuffer, keyBuffer) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
        let encrypted = cipher.update(dataBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return { encrypted, iv };
    }

    static aesDecrypt(encryptedBuffer, keyBuffer, ivBuffer) {
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted;
    }

    static generateRandomBytes(length) {
        return crypto.randomBytes(length);
    }
}

// ==========================================
// MODULE B: CUSTOM TRANSFORM ENGINE
// ==========================================
class CustomTransform {
    static applyXOR(dataBuffer, keyString) {
        let out = Buffer.alloc(dataBuffer.length);
        for (let i = 0; i < dataBuffer.length; i++) {
            // Digit-level XOR
            out[i] = dataBuffer[i] ^ keyString.charCodeAt(i % keyString.length) ^ (i % 256);
        }
        return out;
    }

    static apply(dataBuffer, key, rounds) {
        let currentData = Buffer.from(dataBuffer);
        let metaOut = [];

        for (let r = 0; r < rounds; r++) {
            let roundMeta = { chunkSizes: [], rotationShift: 0 };
            
            // 1. XOR Setup
            let cycleKey = key + r.toString();
            currentData = this.applyXOR(currentData, cycleKey);

            // 2. Dynamic Chunking & 3. Chunk Reversal
            let chunks = [];
            let offset = 0;
            while (offset < currentData.length) {
                let chunkSize = 16 + Math.floor(Math.random() * 48);
                if (offset + chunkSize > currentData.length) {
                    chunkSize = currentData.length - offset;
                }
                roundMeta.chunkSizes.push(chunkSize);
                
                let chunk = currentData.slice(offset, offset + chunkSize);
                
                // Reverse chunk
                let reversedChunk = Buffer.alloc(chunk.length);
                for(let i=0; i<chunk.length; i++) {
                    reversedChunk[i] = chunk[chunk.length - 1 - i];
                }
                chunks.push(reversedChunk);
                offset += chunkSize;
            }

            // 4. LIFO Stack
            let stackedChunks = chunks.reverse();
            currentData = Buffer.concat(stackedChunks);

            // 5. Permutation / Rotation
            roundMeta.rotationShift = Math.floor(Math.random() * currentData.length);
            let leftPart = currentData.slice(0, currentData.length - roundMeta.rotationShift);
            let rightPart = currentData.slice(currentData.length - roundMeta.rotationShift);
            currentData = Buffer.concat([rightPart, leftPart]);

            metaOut.push(roundMeta);
        }
        return { data: currentData, meta: metaOut };
    }

    static reverse(transformedBuffer, key, rounds, metaArray) {
        let currentData = Buffer.from(transformedBuffer);

        for (let r = rounds - 1; r >= 0; r--) {
            let roundMeta = metaArray[r];

            // 1. Reverse Permutation
            let leftPart = currentData.slice(0, roundMeta.rotationShift);
            let rightPart = currentData.slice(roundMeta.rotationShift);
            currentData = Buffer.concat([rightPart, leftPart]);

            // 2. Reverse Stack & Chunking
            let reversedChunks = [];
            let offset = 0;
            let reversedSizes = [...roundMeta.chunkSizes].reverse();
            
            for (let chunkSize of reversedSizes) {
                let chunk = currentData.slice(offset, offset + chunkSize);
                reversedChunks.push(chunk);
                offset += chunkSize;
            }

            // 3. LIFO (reverse order back) & Reverse Chunk Bytes
            let originalOrderChunks = reversedChunks.reverse();
            let restoredChunks = originalOrderChunks.map(chunk => {
                let unreversed = Buffer.alloc(chunk.length);
                for(let i=0; i<chunk.length; i++) {
                    unreversed[i] = chunk[chunk.length - 1 - i];
                }
                return unreversed;
            });
            currentData = Buffer.concat(restoredChunks);

            // 4. Reverse XOR
            let cycleKey = key + r.toString();
            currentData = this.applyXOR(currentData, cycleKey);
        }

        return currentData;
    }
}

// ==========================================
// MAIN SIMULATION
// ==========================================

console.log("[SYSTEM] Generating Hospital RSA-2048 Keypair...");
const { publicKey: hospitalPubKey, privateKey: hospitalPrivKey } = CryptoEngine.generateRSAKeyPair();
console.log("[SYSTEM] RSA Keys generated.\n");

console.log(">> PATIENT SIDE EXECUTING <<");
let rawData = 
    "PATIENT REPORT CONFIDENTIAL\n" +
    "Name: John Doe\n" +
    "DOB: 1980-05-15\n" +
    "Condition: Hypertension\n" +
    "Notes: Requires monitoring, prescribed ACE inhibitors.\n" +
    "----- BEGIN LARGE MOCK DATA -----\n";
for(let i=0; i<10; i++) {
    rawData += `Line ${i}: vital signs stable, continuous observation recorded.\n`;
}

console.log(`[PATIENT] Original Data snippet: \n   ${rawData.substring(0, 50)}...\n`);

const patientPassword = "MySecurePatientPassword123";
const salt = CryptoEngine.generateRandomBytes(16);
console.log("[PATIENT] Deriving AES key using PBKDF2...");
const aesKey = CryptoEngine.deriveKeyWithPBKDF2(patientPassword, salt);

console.log("[PATIENT] Encrypting data with AES-256-CBC...");
let inputBuffer = Buffer.from(rawData);
const { encrypted: aesEncrypted, iv: aesIv } = CryptoEngine.aesEncrypt(inputBuffer, aesKey);
printHexSnippet("AES Encrypted Data", aesEncrypted);

console.log("[PATIENT] Applying Custom Transformation...");
const numRounds = 3;
const transformKey = "SecretHospitalTransformSequence";
const { data: fullyTransformed, meta: transformMeta } = CustomTransform.apply(aesEncrypted, transformKey, numRounds);
printHexSnippet("Fully Transformed Data", fullyTransformed);

console.log("[PATIENT] Encrypting AES Key with Hospital's RSA Public Key...");
const rsaEncryptedAesKey = CryptoEngine.rsaEncrypt(aesKey, hospitalPubKey);

console.log("[PATIENT] --- Generating Transfer Payload (QR/NFC Session) ---");
console.log("   - Session ID: SES_9988776655");
console.log(`   - Embedded Encrypted AES Key (Len: ${rsaEncryptedAesKey.length})`);
console.log(`   - Embedded AES IV (Len: ${aesIv.length})`);
console.log(`   - Embedded PBKDF2 Salt (Len: ${salt.length})`);
console.log(`   - Transformation Metadata included (${numRounds} rounds)\n`);


console.log(">> HOSPITAL SIDE EXECUTING <<");
console.log("[HOSPITAL] Decrypting AES key with Hospital's RSA Private Key...");
const recoveredAesKey = CryptoEngine.rsaDecrypt(rsaEncryptedAesKey, hospitalPrivKey);

console.log("[HOSPITAL] Reversing Custom Transformation Layer...");
const reversedTransform = CustomTransform.reverse(fullyTransformed, transformKey, numRounds, transformMeta);

if (reversedTransform.equals(aesEncrypted)) {
    console.log("[HOSPITAL] Transformation successfully reversed!");
} else {
    console.error("[HOSPITAL] Transformed reversal failed.");
    process.exit(1);
}

console.log("[HOSPITAL] Decrypting inner payload with AES-256-CBC...");
const decryptedData = CryptoEngine.aesDecrypt(reversedTransform, recoveredAesKey, aesIv);
const finalStr = decryptedData.toString('utf8');

console.log("\n========================================");
console.log(" RECOVERED PATIENT DATA");
console.log("========================================");
console.log(finalStr);

if (finalStr === rawData) {
    console.log("\n[SUCCESS] The decrypted output perfectly matches the original input!\n");
} else {
    console.error("\n[ERROR] Decrypted output mismatch.\n");
}
