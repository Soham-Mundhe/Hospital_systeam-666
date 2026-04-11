#ifndef CUSTOM_TRANSFORM_H
#define CUSTOM_TRANSFORM_H

#include <vector>
#include <string>

struct TransformMetadata {
    std::vector<int> chunkSizes;
    int rotationShift;
};

class CustomTransform {
public:
    // Applies dynamic chunking, LIFO stack reordering, chunk reversal, rotation, and XOR targeting.
    static std::vector<unsigned char> apply(
        const std::vector<unsigned char>& data, 
        const std::string& key, 
        int rounds, 
        std::vector<TransformMetadata>& metaOut);

    // Reverses the custom transformations using the stored metadata.
    static std::vector<unsigned char> reverse(
        const std::vector<unsigned char>& transformedData, 
        const std::string& key, 
        int rounds, 
        const std::vector<TransformMetadata>& meta);
        
private:
    static std::vector<unsigned char> applyXOR(const std::vector<unsigned char>& data, const std::string& key);
    static void reverseChunkBytes(std::vector<unsigned char>& chunk);
};

#endif // CUSTOM_TRANSFORM_H
