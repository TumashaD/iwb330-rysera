import ballerina/regex;

public type Vector [float, float, float];

public isolated class WeightCalculator {

    // Binary detection function
    private isolated function isBinarySTL(byte[] stlContent) returns boolean {
        if stlContent.length() < 84 {  // Min size for header + triangle count
            return false;
        }
        
        // Check if first 5 bytes spell "solid"
        if stlContent[0] == 115 && stlContent[1] == 111 && stlContent[2] == 108 && 
           stlContent[3] == 105 && stlContent[4] == 100 {
            // Additional validation for ASCII: check if we can find "facet" after "solid"
            string|error headerText = string:fromBytes(stlContent.slice(0, 80));
            if headerText is string {
                return !regex:matches(headerText, ".*facet.*");
            }
        }
        
        // If we can't confirm it's ASCII, treat as binary
        return true;
    }

    // Parse the ASCII STL format
    isolated function parseASCIISTL(byte[] stlContent) returns Vector[][]|error {
        // First convert just the content we need to process
        string|error stlText = string:fromBytes(stlContent);
        if stlText is error {
            return error("Failed to decode STL content as ASCII");
        }
        
        Vector[][] triangles = [];
        
        // Regular expression pattern to match each vertex line
        string vertexPattern = "vertex\\s+([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\\s+([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\\s+([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)";
        
        // Use regex:searchAll to find all matching vertex lines
        regex:Match[] vertexMatches = regex:searchAll(stlText, vertexPattern);
        
        if vertexMatches.length() % 3 != 0 {
            return error("Invalid STL format, number of vertices is not a multiple of 3");
        }

        Vector[] currentTriangle = [];
        
        foreach var vertex in vertexMatches {
            string[] coordinates = regex:split(vertex.matched, "\\s+");
            if coordinates.length() != 4 {
                return error("Invalid vertex format: " + vertex.matched);
            }

            Vector point = [
                check float:fromString(coordinates[1]),
                check float:fromString(coordinates[2]),
                check float:fromString(coordinates[3])
            ];

            currentTriangle.push(point);

            if currentTriangle.length() == 3 {
                triangles.push(currentTriangle);
                currentTriangle = [];
            }
        }

        if triangles.length() == 0 {
            return error("No valid triangles found in the ASCII STL file");
        }

        return triangles;
    }

    // Parse the Binary STL format
    isolated function parseBinarySTL(byte[] stlContent) returns Vector[][]|error {
        if stlContent.length() < 84 {  // Minimum size for a valid binary STL
            return error("Invalid binary STL: file too small");
        }

        int offset = 80;  // Skip header
        int numTriangles = check self.readUint32(stlContent, offset);
        offset += 4;

        // Validate file size matches expected size for number of triangles
        int expectedSize = 84 + (numTriangles * 50);  // Header + triangle count + (50 bytes per triangle)
        if stlContent.length() != expectedSize {
            return error(string `Invalid binary STL: file size ${stlContent.length()} doesn't match expected size ${expectedSize} for ${numTriangles} triangles`);
        }

        Vector[][] triangles = [];

        foreach int i in 0 ..< numTriangles {
            // Skip normal vector (12 bytes)
            offset += 12;

            // Parse vertices
            Vector p1 = [
                check self.readFloat32(stlContent, offset),
                check self.readFloat32(stlContent, offset + 4),
                check self.readFloat32(stlContent, offset + 8)
            ];
            offset += 12;

            Vector p2 = [
                check self.readFloat32(stlContent, offset),
                check self.readFloat32(stlContent, offset + 4),
                check self.readFloat32(stlContent, offset + 8)
            ];
            offset += 12;

            Vector p3 = [
                check self.readFloat32(stlContent, offset),
                check self.readFloat32(stlContent, offset + 4),
                check self.readFloat32(stlContent, offset + 8)
            ];
            offset += 12;

            offset += 2;  // Skip attribute byte count
            triangles.push([p1, p2, p3]);
        }

        return triangles;
    }

    // Helper function to read an unsigned 32-bit integer from a byte array
    isolated function readUint32(byte[] data, int offset) returns int|error {
        if (data.length() < offset + 4) {
            return error("Insufficient data to read uint32");
        }
        return (data[offset] & 0xFF) | 
               ((data[offset + 1] & 0xFF) << 8) | 
               ((data[offset + 2] & 0xFF) << 16) | 
               ((data[offset + 3] & 0xFF) << 24);
    }

    // Helper function to read a 32-bit float from a byte array
    isolated function readFloat32(byte[] data, int offset) returns float|error {
        if (data.length() < offset + 4) {
            return error("Insufficient data to read float32");
        }
        
        // Get the bytes in correct order (assuming little-endian input)
        int b0 = data[offset] & 0xFF;
        int b1 = data[offset + 1] & 0xFF;
        int b2 = data[offset + 2] & 0xFF;
        int b3 = data[offset + 3] & 0xFF;
        
        // Reconstruct the floating point number according to IEEE 754
        int sign = (b3 >> 7) & 0x1;
        int exponent = ((b3 & 0x7F) << 1) | ((b2 & 0x80) >> 7);
        int mantissa = ((b2 & 0x7F) << 16) | (b1 << 8) | b0;
        
        if (exponent == 0 && mantissa == 0) {
            return sign == 0 ? 0.0 : -0.0;
        }
        
        if (exponent == 0xFF) {
            if (mantissa == 0) {
                return sign == 0 ? float:Infinity : -float:Infinity;
            }
            return float:NaN;
        }
        
        // Convert to actual float value
        float value = 1.0;
        float mantissaFloat = <float>mantissa / 8388608.0; // 2^23
        
        if (exponent == 0) {
            value = mantissaFloat / 2.0;
            exponent = 1;
        } else {
            value = 1.0 + mantissaFloat;
        }
        
        float result = value * float:pow(2.0, <float>(exponent - 127));
        return sign == 0 ? result : -result;
    }

    // Volume calculation functions
    isolated function signedVolumeOfTriangle(Vector p1, Vector p2, Vector p3) returns float {
        float v321 = p3[0] * p2[1] * p1[2];
        float v231 = p2[0] * p3[1] * p1[2];
        float v312 = p3[0] * p1[1] * p2[2];
        float v132 = p1[0] * p3[1] * p2[2];
        float v213 = p2[0] * p1[1] * p3[2];
        float v123 = p1[0] * p2[1] * p3[2];
        
        return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
    }

    isolated function volumeOfMesh(Vector[][] triangles) returns float {
        float totalVolume = 0;

        foreach var triangle in triangles {
            Vector p1 = triangle[0];
            Vector p2 = triangle[1];
            Vector p3 = triangle[2];
            totalVolume += self.signedVolumeOfTriangle(p1, p2, p3);
        }

        // Total volume of the mesh, no need for abs() as the sum of signed volumes gives the correct result.
        return totalVolume / 1000;
    }

    // Main entry point for parsing STL files
    public isolated function getSTLdata(byte[] stlContent) returns record {|Vector[][] triangles; float volume;|}|error {
        Vector[][] triangles;
        if self.isBinarySTL(stlContent) {
            triangles = check self.parseBinarySTL(stlContent);
        } else {
            triangles = check self.parseASCIISTL(stlContent);
        }
        return {triangles: triangles, volume: self.volumeOfMesh(triangles)};
    }

    public function estimateWeight(float volume, float density) returns float {
        return volume * density;
    }
}