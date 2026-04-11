#include "CryptoEngine.h"
#include <openssl/pem.h>
#include <openssl/err.h>
#include <openssl/rand.h>
#include <stdexcept>

// Generate an RSA Key Pair
bool CryptoEngine::generateRSAKeyPair(std::string& publicKey, std::string& privateKey) {
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
    if (!ctx) return false;
    
    if (EVP_PKEY_keygen_init(ctx) <= 0) {
        EVP_PKEY_CTX_free(ctx);
        return false;
    }
    
    if (EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 2048) <= 0) {
        EVP_PKEY_CTX_free(ctx);
        return false;
    }
    
    EVP_PKEY *pkey = NULL;
    if (EVP_PKEY_keygen(ctx, &pkey) <= 0) {
        EVP_PKEY_CTX_free(ctx);
        return false;
    }
    
    BIO *pri = BIO_new(BIO_s_mem());
    BIO *pub = BIO_new(BIO_s_mem());
    
    PEM_write_bio_PrivateKey(pri, pkey, NULL, NULL, 0, NULL, NULL);
    PEM_write_bio_PUBKEY(pub, pkey);
    
    size_t pri_len = BIO_pending(pri);
    size_t pub_len = BIO_pending(pub);
    
    char *pri_key = new char[pri_len + 1];
    char *pub_key = new char[pub_len + 1];
    
    BIO_read(pri, pri_key, pri_len);
    BIO_read(pub, pub_key, pub_len);
    pri_key[pri_len] = '\0';
    pub_key[pub_len] = '\0';
    
    publicKey = std::string(pub_key);
    privateKey = std::string(pri_key);
    
    delete[] pri_key;
    delete[] pub_key;
    BIO_free_all(pri);
    BIO_free_all(pub);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);
    
    return true;
}

std::vector<unsigned char> CryptoEngine::rsaEncrypt(const std::vector<unsigned char>& data, const std::string& publicKey) {
    BIO* bo = BIO_new(BIO_s_mem());
    BIO_write(bo, publicKey.c_str(), publicKey.length());
    EVP_PKEY* pkey = PEM_read_bio_PUBKEY(bo, NULL, NULL, NULL);
    BIO_free(bo);
    
    if (!pkey) throw std::runtime_error("Failed to load public key");
    
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(pkey, NULL);
    if (!ctx || EVP_PKEY_encrypt_init(ctx) <= 0) {
        EVP_PKEY_free(pkey);
        throw std::runtime_error("Failed to init RSA encryption");
    }
    
    if (EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_OAEP_PADDING) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to set RSA padding");
    }
    
    size_t outlen;
    if (EVP_PKEY_encrypt(ctx, NULL, &outlen, data.data(), data.size()) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to determine buffer size for RSA encrypt");
    }
    
    std::vector<unsigned char> out(outlen);
    if (EVP_PKEY_encrypt(ctx, out.data(), &outlen, data.data(), data.size()) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to RSA encrypt");
    }
    
    out.resize(outlen);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);
    return out;
}

std::vector<unsigned char> CryptoEngine::rsaDecrypt(const std::vector<unsigned char>& encryptedData, const std::string& privateKey) {
    BIO* bo = BIO_new(BIO_s_mem());
    BIO_write(bo, privateKey.c_str(), privateKey.length());
    EVP_PKEY* pkey = PEM_read_bio_PrivateKey(bo, NULL, NULL, NULL);
    BIO_free(bo);
    
    if (!pkey) throw std::runtime_error("Failed to load private key");
    
    EVP_PKEY_CTX* ctx = EVP_PKEY_CTX_new(pkey, NULL);
    if (!ctx || EVP_PKEY_decrypt_init(ctx) <= 0) {
        EVP_PKEY_free(pkey);
        throw std::runtime_error("Failed to init RSA decryption");
    }
    
    if (EVP_PKEY_CTX_set_rsa_padding(ctx, RSA_PKCS1_OAEP_PADDING) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to set RSA padding");
    }
    
    size_t outlen;
    if (EVP_PKEY_decrypt(ctx, NULL, &outlen, encryptedData.data(), encryptedData.size()) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to determine buffer size for RSA decrypt");
    }
    
    std::vector<unsigned char> out(outlen);
    if (EVP_PKEY_decrypt(ctx, out.data(), &outlen, encryptedData.data(), encryptedData.size()) <= 0) {
        EVP_PKEY_free(pkey); EVP_PKEY_CTX_free(ctx);
        throw std::runtime_error("Failed to RSA decrypt");
    }
    
    out.resize(outlen);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);
    return out;
}

std::vector<unsigned char> CryptoEngine::deriveKeyWithPBKDF2(const std::string& password, const std::vector<unsigned char>& salt) {
    const int iterations = 100000;
    const int keyLength = 32; // 256 bits for AES-256
    std::vector<unsigned char> key(keyLength);
    
    if (PKCS5_PBKDF2_HMAC(password.c_str(), password.length(), salt.data(), salt.size(),
                          iterations, EVP_sha256(), keyLength, key.data()) == 0) {
        throw std::runtime_error("Failed to derive key using PBKDF2");
    }
    
    return key;
}

std::vector<unsigned char> CryptoEngine::aesEncrypt(const std::vector<unsigned char>& data, const std::vector<unsigned char>& key, std::vector<unsigned char>& iv_out) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create context");

    iv_out = generateRandomBytes(16);
    
    if (1 != EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, key.data(), iv_out.data())) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_EncryptInit_ex failed");
    }

    std::vector<unsigned char> ciphertext(data.size() + EVP_MAX_BLOCK_LENGTH);
    int len = 0;
    int ciphertext_len = 0;

    if (1 != EVP_EncryptUpdate(ctx, ciphertext.data(), &len, data.data(), data.size())) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_EncryptUpdate failed");
    }
    ciphertext_len = len;

    if (1 != EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len)) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_EncryptFinal_ex failed");
    }
    ciphertext_len += len;
    
    EVP_CIPHER_CTX_free(ctx);
    ciphertext.resize(ciphertext_len);
    return ciphertext;
}

std::vector<unsigned char> CryptoEngine::aesDecrypt(const std::vector<unsigned char>& encryptedData, const std::vector<unsigned char>& key, const std::vector<unsigned char>& iv) {
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    if (!ctx) throw std::runtime_error("Failed to create decrypt context");

    if (1 != EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, key.data(), iv.data())) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_DecryptInit_ex failed");
    }

    std::vector<unsigned char> plaintext(encryptedData.size() + EVP_MAX_BLOCK_LENGTH);
    int len = 0;
    int plaintext_len = 0;

    if (1 != EVP_DecryptUpdate(ctx, plaintext.data(), &len, encryptedData.data(), encryptedData.size())) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_DecryptUpdate failed");
    }
    plaintext_len = len;

    if (1 != EVP_DecryptFinal_ex(ctx, plaintext.data() + len, &len)) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("EVP_DecryptFinal_ex failed");
    }
    plaintext_len += len;
    
    EVP_CIPHER_CTX_free(ctx);
    plaintext.resize(plaintext_len);
    return plaintext;
}

std::vector<unsigned char> CryptoEngine::generateRandomBytes(int length) {
    std::vector<unsigned char> buffer(length);
    if (RAND_bytes(buffer.data(), length) != 1) {
        throw std::runtime_error("Failed to generate random bytes");
    }
    return buffer;
}
