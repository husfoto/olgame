function getSpeed(fromPosition,toPosition){
	// Returns speed in m/s for the current location
	var ascedLength = 5;
	var runDirectionVector = toPosition-fromPosition;
		runDirectionVector.length = ascendLength;
	var currentPixel = terrainMap.getPixel(fromPosition);
	var forwardPixel = terrainMap.getPixel(fromPosition+runDirectionVector);
	var currentHeight = currentPixel.red*256;
	var forwardHeight = forwardPixel.red*256;
	var currentTerrain = currentPixel.green*50; // 0-1 should give *100 for min/km in terrain
	var ascend = (forwardHeight-currentHeight)/ascendLength;
	var speed = (Math.pow(ascend*0.7-0.3,2)+0.9)*currentTerrain; // in min/km

	return 1/(speed*0.06); // Convert to m/s
}
