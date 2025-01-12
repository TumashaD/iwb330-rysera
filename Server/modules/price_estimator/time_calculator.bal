public isolated class PrintTimeEstimator {
    private final float DEFAULT_LAYER_HEIGHT = 0.4;  // mm
    private final float DEFAULT_PRINT_SPEED = 50;    // mm/s
    private final float DEFAULT_TRAVEL_SPEED = 120;  // mm/s
    private final float DEFAULT_FIRST_LAYER_SPEED = 20; // mm/s
    private final float ACCELERATION_TIME_FACTOR = 1.15; // Factor to account for acceleration/deceleration
    private final float BRIDGING_SPEED = 40;
    private final float RETRACTION_TIME = 2; // seconds per retraction
    
    private final float layerHeight;
    private final float printSpeed;
    private final float travelSpeed;
    private final float firstLayerSpeed;
    
    public isolated function init(float layerHeight = 0, float printSpeed = 0, 
                                float travelSpeed = 0, float firstLayerSpeed = 0) {
        self.layerHeight = layerHeight > 0.0 ? layerHeight : self.DEFAULT_LAYER_HEIGHT;
        self.printSpeed = printSpeed > 0.0 ? printSpeed : self.DEFAULT_PRINT_SPEED;
        self.travelSpeed = travelSpeed > 0.0 ? travelSpeed : self.DEFAULT_TRAVEL_SPEED;
        self.firstLayerSpeed = firstLayerSpeed > 0.0 ? firstLayerSpeed : self.DEFAULT_FIRST_LAYER_SPEED;
    }
    
    // Calculate approximate printing time based on mesh geometry
    public isolated function estimatePrintTime(Vector[][] triangles) returns float|error {
        // Calculate model dimensions
        var [minX, maxX, minY, maxY, minZ, maxZ] = check self.calculateBoundingBox(triangles);
        float width = maxX - minX;
        float depth = maxY - minY;
        float height = maxZ - minZ;
        
        // Calculate number of layers
        int totalLayers = <int>(height / self.layerHeight + 0.5);
        if totalLayers < 1 {
            return error("Invalid model height or layer height");
        }
        
        // Estimate perimeter length per layer (simplified as rectangular)
        float avgPerimeterLength = 2 * (width + depth);
        
        // Estimate infill distance per layer
        float layerArea = width * depth;
        float infillDensity = 0.2; // 20% infill as default
        float infillDistance = (layerArea * infillDensity) / self.layerHeight;
        
        // Calculate time components
        float firstLayerTime = self.calculateLayerTime(avgPerimeterLength, infillDistance, self.firstLayerSpeed);
        float regularLayerTime = self.calculateLayerTime(avgPerimeterLength, infillDistance, self.printSpeed);
        
        // Total print time (in seconds)
        float totalTime = firstLayerTime + (regularLayerTime * (totalLayers - 1));
        
        // Add time for travel moves
        float travelTimePerLayer = self.estimateTravelTime(width, depth);
        totalTime += (travelTimePerLayer * totalLayers);
        
        // Simple bridging distance approximation
        float bridgingDistance = (width + depth) / 2;
        float bridgingTime = bridgingDistance / self.BRIDGING_SPEED;
        totalTime += bridgingTime * totalLayers;
        
        // Add retraction time
        totalTime += (self.RETRACTION_TIME * totalLayers);
        
        // Account for acceleration/deceleration
        totalTime *= self.ACCELERATION_TIME_FACTOR;
        
        // Add basic time for heating and initialization
        float setupTime = 180; // 3 minutes for heating and initialization
        totalTime += setupTime;
        
        return totalTime;
    }
    
    // Calculate bounding box of the mesh
    private isolated function calculateBoundingBox(Vector[][] triangles) returns [float, float, float, float, float, float]|error {
        if triangles.length() == 0 {
            return error("Empty mesh");
        }
        
        float minX = 3.402823e+38;
        float maxX = -3.402823e+38;
        float minY = 3.402823e+38;
        float maxY = -3.402823e+38;
        float minZ = 3.402823e+38;
        float maxZ = -3.402823e+38;
        
        foreach var triangle in triangles {
            foreach var point in triangle {
                minX = float:min(minX, point[0]);
                maxX = float:max(maxX, point[0]);
                minY = float:min(minY, point[1]);
                maxY = float:max(maxY, point[1]);
                minZ = float:min(minZ, point[2]);
                maxZ = float:max(maxZ, point[2]);
            }
        }
        
        return [minX, maxX, minY, maxY, minZ, maxZ];
    }
    
    // Calculate time for a single layer
    private isolated function calculateLayerTime(float perimeterLength, float infillDistance, float speed) returns float {
        float distance = perimeterLength + infillDistance;
        return distance / speed;
    }
    
    // Estimate time for travel moves in a layer
    private isolated function estimateTravelTime(float width, float depth) returns float {
        float avgTravelDistance = (width + depth) / 2;

        return (avgTravelDistance / self.travelSpeed) * 4; // Assuming average 4 travel moves per layer
    }
}