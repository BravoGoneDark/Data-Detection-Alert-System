#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <cstdint>
#include <algorithm>
#include <cctype>

// 64-bit FNV-1a Hash Constants
const uint64_t FNV_OFFSET_BASIS = 14695981039346656037ULL;
const uint64_t FNV_PRIME = 1099511628211ULL;

inline uint64_t fnv1a_64(const std::string& str) {
    uint64_t hash = FNV_OFFSET_BASIS;
    for (char c : str) {
        hash ^= static_cast<uint8_t>(c);
        hash *= FNV_PRIME;
    }
    return hash;
}

// Bitwise Hamming Distance
extern "C" {
    __declspec(dllexport) int compute_hamming_distance(uint64_t a, uint64_t b) {
        uint64_t v = a ^ b;
        // Software popcount for cross-compiler compatibility
        v = v - ((v >> 1) & 0x5555555555555555ULL);
        v = (v & 0x3333333333333333ULL) + ((v >> 2) & 0x3333333333333333ULL);
        return static_cast<int>((((v + (v >> 4)) & 0xF0F0F0F0F0F0F0FULL) * 0x101010101010101ULL) >> 56);
    }

    __declspec(dllexport) uint64_t compute_simhash_cpp(const char* text_cstr, int shingle_size) {
        if (!text_cstr) return 0;
        std::string text(text_cstr);
        if (text.empty()) return 0;

        // Clean & normalize text to lowercase
        std::string clean;
        clean.reserve(text.size());
        for (char c : text) {
            if (std::isalnum(static_cast<unsigned char>(c)) || std::isspace(static_cast<unsigned char>(c))) {
                clean.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
            }
        }

        if (clean.empty()) return 0;

        // 64-dimensional accumulator vector
        int v[64] = {0};

        if (static_cast<int>(clean.size()) < shingle_size) {
            uint64_t h = fnv1a_64(clean);
            for (int i = 0; i < 64; ++i) {
                if ((h >> i) & 1ULL) v[i]++;
                else v[i]--;
            }
        } else {
            // Character n-gram shingling
            for (size_t i = 0; i + shingle_size <= clean.size(); ++i) {
                std::string shingle = clean.substr(i, shingle_size);
                uint64_t h = fnv1a_64(shingle);
                for (int bit = 0; bit < 64; ++bit) {
                    if ((h >> bit) & 1ULL) {
                        v[bit]++;
                    } else {
                        v[bit]--;
                    }
                }
            }
        }

        // Construct 64-bit fingerprint
        uint64_t fingerprint = 0;
        for (int i = 0; i < 64; ++i) {
            if (v[i] > 0) {
                fingerprint |= (1ULL << i);
            }
        }

        return fingerprint;
    }
}
