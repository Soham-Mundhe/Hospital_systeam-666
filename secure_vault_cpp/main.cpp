#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include "CryptoEngine.h"
#include "CustomTransform.h"

// Helper to print bytes as Hex
void printHexSnippet(const std::string& title, const std::vector<unsigned char>& data) {
    std::cout << "=== " << title << " ===" << std::endl;
    std::cout << "Length: " << data.size() << " bytes" << std::endl;
    
    int printLen = std::min((int)data.size(), 32);
    for (int i = 0; i < printLen; i++) {
        std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)data[i] << " ";
    }
    if (data.size() > 32) {
        std::cout << "...";
    }
    std::cout << std::dec << std::endl << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << " SECURE HOSPITAL DIGITAL VAULT PROTOTYPE" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;

    srand(12345); // Seed for reproducible simulation if needed, or time(0) for real

    // --- SETUP: Hospital Keys ---
    std::cout << "[SYSTEM] Generating Hospital RSA-2048 Keypair..." << std::endl;
    std::string hospitalPubKey, hospitalPrivKey;
    if (!CryptoEngine::generateRSAKeyPair(hospitalPubKey, hospitalPrivKey)) {
        std::cerr << "Failed to generate RSA keys!" << std::endl;
        return 1;
    }
    std::cout << "[SYSTEM] RSA Keys generated.\n" << std::endl;

    // --- PHASE 1: PATIENT SIDE ---
    std::cout << ">> PATIENT SIDE EXECUTING <<" << std::endl;
    
    // 1. Input Data
    std::string rawData = 
        "PATIENT REPORT CONFIDENTIAL\n"
        "Name: John Doe\n"
        "DOB: 1980-05-15\n"
        "Condition: Hypertension\n"
        "Notes: Requires monitoring, prescribed ACE inhibitors.\n"
        "----- BEGIN LARGE MOCK DATA -----\n";
        
    for(int i=0; i<10; i++) {
        rawData += "Line " + std::to_string(i) + ": vital signs stable, continuous observation recorded.\n";
    }

    std::vector<unsigned char> inputBytes(rawData.begin(), rawData.end());
    std::cout << "[PATIENT] Original Data snippet: \n   " << rawData.substr(0, 50) << "...\n" << std::endl;

    // 2. Encryption Key Generation
    std::string patientPassword = "MySecurePatientPassword123";
    std::vector<unsigned char> salt = CryptoEngine::generateRandomBytes(16);
    std::cout << "[PATIENT] Deriving AES key using PBKDF2..." << std::endl;
    std::vector<unsigned char> aesKey = CryptoEngine::deriveKeyWithPBKDF2(patientPassword, salt);
    
    // 3. AES Encryption
    std::cout << "[PATIENT] Encrypting data with AES-256-CBC..." << std::endl;
    std::vector<unsigned char> aesIv; // Generated internally
    std::vector<unsigned char> aesEncrypted = CryptoEngine::aesEncrypt(inputBytes, aesKey, aesIv);
    printHexSnippet("AES Encrypted Data", aesEncrypted);

    // 4. Custom Transformation Layer
    std::cout << "[PATIENT] Applying Custom Transformation (Dynamic Chunking, LIFO, XOR, Reversal)..." << std::endl;
    std::vector<TransformMetadata> transformMeta;
    int numRounds = 3;
    std::string transformKey = "SecretHospitalTransformSequence";
    std::vector<unsigned char> fullyTransformed = CustomTransform::apply(aesEncrypted, transformKey, numRounds, transformMeta);
    printHexSnippet("Fully Transformed Data", fullyTransformed);

    // 5. RSA Encrypt the AES Key
    std::cout << "[PATIENT] Encrypting AES Key with Hospital's RSA Public Key..." << std::endl;
    std::vector<unsigned char> rsaEncryptedAesKey = CryptoEngine::rsaEncrypt(aesKey, hospitalPubKey);

    // 6. Payload Generation (Simulated)
    std::cout << "[PATIENT] --- Generating Transfer Payload (QR/NFC Session) ---" << std::endl;
    std::cout << "   - Session ID: SES_9988776655" << std::endl;
    std::cout << "   - Embedded Encrypted AES Key (Len: " << rsaEncryptedAesKey.size() << ")" << std::endl;
    std::cout << "   - Embedded AES IV (Len: " << aesIv.size() << ")" << std::endl;
    std::cout << "   - Embedded PBKDF2 Salt (Len: " << salt.size() << ")" << std::endl;
    std::cout << "   - Transformation Metadata included (" << numRounds << " rounds)\n" << std::endl;


    // --- PHASE 2: HOSPITAL SIDE ---
    std::cout << ">> HOSPITAL SIDE EXECUTING <<" << std::endl;
    
    // 1. Decrypt AES Key using Private RSA
    std::cout << "[HOSPITAL] Decrypting AES key with Hospital's RSA Private Key..." << std::endl;
    std::vector<unsigned char> recoveredAesKey = CryptoEngine::rsaDecrypt(rsaEncryptedAesKey, hospitalPrivKey);

    // 2. Reverse Custom Transformation
    std::cout << "[HOSPITAL] Reversing Custom Transformation Layer..." << std::endl;
    std::vector<unsigned char> reversedTransform = CustomTransform::reverse(fullyTransformed, transformKey, numRounds, transformMeta);
    
    if (reversedTransform == aesEncrypted) {
        std::cout << "[HOSPITAL] Transformation successfully reversed!" << std::endl;
    } else {
        std::cerr << "[HOSPITAL] Transformed reversal failed." << std::endl;
        return 1;
    }

    // 3. AES Decryption
    std::cout << "[HOSPITAL] Decrypting inner payload with AES-256-CBC..." << std::endl;
    std::vector<unsigned char> decryptedData = CryptoEngine::aesDecrypt(reversedTransform, recoveredAesKey, aesIv);
    
    std::string finalStr(decryptedData.begin(), decryptedData.end());

    std::cout << "\n========================================" << std::endl;
    std::cout << " RECOVERED PATIENT DATA" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << finalStr << std::endl;
    
    // Verify Consistency
    if (finalStr == rawData) {
        std::cout << "\n[SUCCESS] The decrypted output perfectly matches the original input!\n" << std::endl;
    } else {
        std::cerr << "\n[ERROR] Decrypted output mismatch.\n" << std::endl;
    }

    return 0;
}
