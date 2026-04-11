#ifndef CRYPTO_ENGINE_H
#define CRYPTO_ENGINE_H

#include <string>
#include <vector>
#include <memory>
#include <openssl/evp.h>
#include <openssl/rsa.h>

class CryptoEngine {
public:
    // Generate an RSA Keypair
    static bool generateRSAKeyPair(std::string& publicKey, std::string& privateKey);
    
    // RSA Encrypt/Decrypt
    static std::vector<unsigned char> rsaEncrypt(const std::vector<unsigned char>& data, const std::string& publicKey);
    static std::vector<unsigned char> rsaDecrypt(const std::vector<unsigned char>& encryptedData, const std::string& privateKey);

    // PBKDF2 Key Derivation
    static std::vector<unsigned char> deriveKeyWithPBKDF2(const std::string& password, const std::vector<unsigned char>& salt);

    // AES-256-CBC Encrypt/Decrypt
    static std::vector<unsigned char> aesEncrypt(const std::vector<unsigned char>& data, const std::vector<unsigned char>& key, std::vector<unsigned char>& iv_out);
    static std::vector<unsigned char> aesDecrypt(const std::vector<unsigned char>& encryptedData, const std::vector<unsigned char>& key, const std::vector<unsigned char>& iv);

    // Random bytes generation (for salt / IV)
    static std::vector<unsigned char> generateRandomBytes(int length);
};

#endif // CRYPTO_ENGINE_H
