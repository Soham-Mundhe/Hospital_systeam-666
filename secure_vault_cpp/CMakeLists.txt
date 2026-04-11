cmake_minimum_required(VERSION 3.10)
project(SecureVaultPrototype)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find OpenSSL
find_package(OpenSSL REQUIRED)

add_executable(secure_vault 
    main.cpp 
    CryptoEngine.cpp 
    CustomTransform.cpp
)

target_include_directories(secure_vault PRIVATE ${OPENSSL_INCLUDE_DIR})
target_link_libraries(secure_vault PRIVATE OpenSSL::SSL OpenSSL::Crypto)
