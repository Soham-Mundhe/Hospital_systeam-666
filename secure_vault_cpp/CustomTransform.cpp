#include "CustomTransform.h"
#include <algorithm>
#include <cstdlib>
#include <stack>
#include <iostream>

std::vector<unsigned char> CustomTransform::applyXOR(const std::vector<unsigned char>& data, const std::string& key) {
    std::vector<unsigned char> output = data;
    for (size_t i = 0; i < data.size(); ++i) {
        // Digit-level XOR: byte XORed with key character at position, and position index itself
        output[i] ^= key[i % key.length()] ^ (i % 256);
    }
    return output;
}

void CustomTransform::reverseChunkBytes(std::vector<unsigned char>& chunk) {
    std::reverse(chunk.begin(), chunk.end());
}

std::vector<unsigned char> CustomTransform::apply(
    const std::vector<unsigned char>& data, 
    const std::string& key, 
    int rounds, 
    std::vector<TransformMetadata>& metaOut) 
{
    std::vector<unsigned char> currentData = data;
    metaOut.clear();

    for (int r = 0; r < rounds; ++r) {
        TransformMetadata roundMeta;
        
        // 1. XOR Transformation
        std::string cycleKey = key + std::to_string(r); // Dynamic key per round
        currentData = applyXOR(currentData, cycleKey);

        // 2. Dynamic Chunking
        std::vector<std::vector<unsigned char>> chunks;
        size_t offset = 0;
        while (offset < currentData.size()) {
            // Random chunk size between 16 and 64 bytes
            int chunkSize = 16 + (rand() % 48);
            if (offset + chunkSize > currentData.size()) {
                chunkSize = currentData.size() - offset;
            }
            roundMeta.chunkSizes.push_back(chunkSize);
            
            std::vector<unsigned char> chunk(currentData.begin() + offset, currentData.begin() + offset + chunkSize);
            
            // 3. Chunk Reversal (Swap digits/bytes in chunk)
            reverseChunkBytes(chunk);
            chunks.push_back(chunk);
            
            offset += chunkSize;
        }

        // 4. Stack-based reordering (LIFO)
        std::stack<std::vector<unsigned char>> stack;
        for (const auto& chunk : chunks) {
            stack.push(chunk);
        }
        
        currentData.clear();
        while (!stack.empty()) {
            auto chunk = stack.top();
            stack.pop();
            currentData.insert(currentData.end(), chunk.begin(), chunk.end());
        }

        // 5. Permutation / Rotation
        roundMeta.rotationShift = rand() % currentData.size();
        std::rotate(currentData.rbegin(), currentData.rbegin() + roundMeta.rotationShift, currentData.rend());

        metaOut.push_back(roundMeta);
    }

    return currentData;
}

std::vector<unsigned char> CustomTransform::reverse(
    const std::vector<unsigned char>& transformedData, 
    const std::string& key, 
    int rounds, 
    const std::vector<TransformMetadata>& meta) 
{
    std::vector<unsigned char> currentData = transformedData;

    for (int r = rounds - 1; r >= 0; --r) {
        const auto& roundMeta = meta[r];

        // 1. Reverse Permutation / Rotation
        std::rotate(currentData.begin(), currentData.begin() + roundMeta.rotationShift, currentData.end());

        // 2. Reverse Stack & Chunking
        // Since original was LIFO stacked, the chunks in currentData are in reverse order of original chunkSizes
        std::vector<std::vector<unsigned char>> reversedChunks;
        size_t offset = 0;
        
        // Read chunks backwards from sizes metadata
        for (auto it = roundMeta.chunkSizes.rbegin(); it != roundMeta.chunkSizes.rend(); ++it) {
            int chunkSize = *it;
            std::vector<unsigned char> chunk(currentData.begin() + offset, currentData.begin() + offset + chunkSize);
            reversedChunks.push_back(chunk);
            offset += chunkSize;
        }

        // 3. LIFO Stack Re-apply to get original order and Reverse Chunk Bytes
        std::stack<std::vector<unsigned char>> stack;
        for (const auto& chunk : reversedChunks) {
            // Push to stack to reverse order AGAIN (getting back to original)
            stack.push(chunk);
        }
        
        currentData.clear();
        while (!stack.empty()) {
            auto chunk = stack.top();
            stack.pop();
            // Reverse bytes again to undo chunk reversing
            reverseChunkBytes(chunk);
            currentData.insert(currentData.end(), chunk.begin(), chunk.end());
        }

        // 4. Reverse XOR (XOR is its own inverse)
        std::string cycleKey = key + std::to_string(r);
        currentData = applyXOR(currentData, cycleKey);
    }

    return currentData;
}
