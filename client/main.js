tool.minDistance = 2;
view.zoom=0.1;
dragTolerance=100;

var terrainMap;
var visibleMap;
var olTrack=new Array;
var currentCtrl=1;
var currentLocation, lastLocation, currentDistans;
var dragMap=false;
var legTimes=new Array;

var mainPathBkg = new Path();
mainPathBkg.strokeWidth=6;
mainPathBkg.strokeColor='black';

var mainPath = new Path();
mainPath.strokeWidth=4;
mainPath.strokeColor='orange';

var oldPath = new Path();
var oldPathTail = new Path();
var rearPath = new Path(); //Den smala som visar hela banan
rearPath.strokeColor='blue';
rearPath.strokeWidth=3;

var tolerance = 20;
var blockMouse = false;
var tail=false;
var animateRun=false;
var targetView=view.center; // Sets target view
var targetZoom=0.5;
var currentTime=0;

var	runner=new Path.Circle(view.center,10);
runner.visible=false;
runner.strokeWidth=2;
runner.strokeColor='black';
runner.fillColor='yellow';	

function setOldPathStyle(){
	oldPath.strokeColor='mediumgray';
	oldPath.dashArray=[2,4];
	oldPath.strokeWidth=4;
	oldPathTail.strokeColor=mainPath.strokeColor;
	oldPathTail.dashArray=0;
	oldPathTail.strokeWidth=4;
}

function setPathBkg(){
		mainPathBkg.segments=mainPath.segments;
		mainPathBkg.strokeWidth=6;
		mainPathBkg.strokeColor='black';
}


function getSpeed(fromPosition,toPosition){
	// Returns speed in m/s for the current location
	var ascendLength = 5;
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

function loadImages(trackName,trackId){
    var request = new XMLHttpRequest();
    request.open("GET", "public/tracks/andtorp.json", false);
    request.send(null)
    var my_JSON_object = JSON.parse(request.responseText);
    my_JSON_object.olGame.olTracks[trackId].trackControlPoints.forEach(
    	function(value,index){
    		olTrack.push(new Point(value.x,value.y));//new Point(value.x,value.y)
    	}
    );

	terrainMap=new Raster('terrainMap');
	terrainMap.visible=false;
	terrainMap.position=new Point(terrainMap.bounds.width/2,terrainMap.bounds.height/2);

	visibleMap=new Raster('visibleMap');
	visibleMap.visible=true;
	visibleMap.position=new Point(visibleMap.bounds.width/2,visibleMap.bounds.height/2);
	visibleMap.sendToBack();
}

function drawTrack() {
	var i;
	// Checks angle to first ctrl and draws triangle
	var symbol=new Path();
	var vect=olTrack[0]-olTrack[1];
	vect.length=25;
	vect.angle=vect.angle+180;
	for (i=0;i<3;++i) {
		vect.angle=vect.angle+120;
		symbol.add(olTrack[0]+vect);
	}
	symbol.closed=true;
	symbol.strokeColor='magenta';
	symbol.strokeWidth=4;
	// Draw ctrl-circles
	for (i=1;i<olTrack.length; ++i){
		symbol=new Path.Circle(olTrack[i],20);
		symbol.strokeColor='magenta';
		symbol.strokeWidth=4;
	}
	// Draw goal
	symbol=new Path.Circle(olTrack[olTrack.length-1],14);
	symbol.strokeColor='magenta';
	symbol.strokeWidth=4;
	// Draw Lines
	for (i=0;i<olTrack.length-1; ++i){
		vect=olTrack[i+1]-olTrack[i];
		vect.length=20;
		symbol=new Path.Line(olTrack[i]+vect,olTrack[i+1]-vect);
		symbol.strokeColor='magenta';
		symbol.strokeWidth=4;
	}
	for (i=1;i<olTrack.length-1; ++i){
		var text=new PointText();
		text.fontSize=35;
		text.fillColor='magenta';
		text.position=olTrack[i]+40;
		text.content=i;
	}
}


function onMouseDown(event){
	if (!blockMouse) {
		if ((mainPath.length==0)) { //Empty path?
			if (event.point.getDistance(olTrack[currentCtrl-1])<tolerance){
				mainPath.add(olTrack[currentCtrl-1]);
				mainPath.add(event.point);
			} else {
				dragMap=true;
			};
		} else {
			var closest=mainPath.getNearestPoint(event.point);
			if (event.point.getDistance(closest)<tolerance) { //Check if close to path
				if (mainPath.firstSegment.point==closest) { //Is it the first point?
					oldPath.removeSegments();
					oldPath.addSegments(mainPath.segments);
					mainPath.removeSegments();
					mainPath.add(closest);
				} else if (mainPath.lastSegment.point==closest) { //Is it the last point?
					oldPath.removeSegments();
				} else {
					oldPath=mainPath.split(mainPath.getLocationOf(closest)); //Split line
				}
				setOldPathStyle();
				mainPath.add(event.point);
			} else if (event.point.getDistance(mainPath.lastSegment.point)>dragTolerance) {
				dragMap=true;				
			} else {mainPath.add(event.point)}; //blockMouse=true (scroll or lines) mainPath.add(event.point)
		}
	} else {dragMap=true};
}

function onMouseDrag(event){
	if (dragMap) {
		targetView-=event.delta;
	}
	if (!dragMap && !blockMouse && !(mainPath.length==0)) {
		if (tail){
			oldPath.join(oldPathTail);
			oldPathTail.removeSegments();
			tail=false;
		}
		if (!(oldPath.length==0) && (event.point.getDistance(oldPath.firstSegment.point)>tolerance)) {
			var closest=oldPath.getNearestPoint(event.point);
			if (event.point.getDistance(closest)<tolerance) {
				if (oldPath.lastSegment.point==closest || oldPath.firstSegment.point==closest) {
				} else {
					oldPathTail=oldPath.split(oldPath.getLocationOf(closest));
					setOldPathStyle();
					tail=true;
				}
			}
		}
		mainPath.add(event.point);
		setPathBkg();		
	}
}

function onMouseUp(event){
	if (dragMap) {
		dragMap=false;
	};
	if (!dragMap && !blockMouse && !(mainPath.length==0)) {
		if (tail){
			oldPath.join(oldPathTail);
			oldPathTail.removeSegments();
			tail=false;
		}
		if (!(oldPath.length==0)) {
			var closest=oldPath.getNearestPoint(event.point);
			if (event.point.getDistance(closest)<tolerance) {
				if (oldPath.lastSegment.point==closest) {
				} else if (oldPath.firstSegment.point==closest) {
					mainPath.join(oldPath);
				} else {
					mainPath.join(oldPath.split(oldPath.getLocationOf(closest)));
				}
			}
		}
		oldPath.removeSegments();
		setPathBkg();
		if (event.point.getDistance(olTrack[currentCtrl])<20) {
			blockMouse=true;
			mainPath.add(olTrack[currentCtrl]);
			setPathBkg();
			activateNextCtrl();
		}
	}/* else {
		console.log(mainPath.segments.length);
		mainPath.smooth;
		mainPath.simplify(2);
		console.log(mainPath.segments.length);
	}*/
}

function centerOnCtrl(idx){
	// Finds the centerpoint to the current ctrl and centers view
	var vect=olTrack[idx]-olTrack[idx-1];
	vect.length=vect.length/2;
	targetView=olTrack[idx-1]+vect;
	targetZoom=1;
}

function activateNextCtrl(){
	blockMouse=true;
	if (currentCtrl<(olTrack.length)){
		mainPath.simplify();
		rearPath.addSegments(mainPath.segments);
		mainPathBkg.removeSegments();

		currentDistans=0;
		currentTime=0;
		currentLocation=mainPath.getLocationAt(currentDistans).point;
		currentDistans=2;
		runner.visible=true;
		animateRun=true;
		targetZoom=0.5;
	}
}

function updateLegTimes() {
	var totalTime=0;
	var legTableStr='<div class="legTable">';
	legTimes.forEach(function(value, index){
		totalTime+=value;
		legTableStr+='<div class="legTableRow"><div class="legTableColLeft">Str.'+index+'</div><div class="legTableColRight">'+value.toFixed(2)+'</div></div>';		
	});
	legTableStr+='<div class="legTableRow"><div class="legTableColLeft">Total tid</div><div class="legTableColRight">'+totalTime.toFixed(2)+'</div></div>';
	legTableStr+='</div>';
	document.getElementById("dialog").innerHTML=legTableStr;
}

function onFrame(event){
//console.log(legTimes.length);
	// Animate the run //Check order of events
	if (animateRun) {
		if (currentDistans<mainPath.length){
			lastLocation=currentLocation;
			currentLocation=mainPath.getLocationAt(currentDistans).point;
			currentDistans+=getSpeed(lastLocation,currentLocation)*event.delta*250;
			runner.position=currentLocation;
			targetView=runner.position;
			currentTime+=event.delta;
			legTimes[currentCtrl]=currentTime/3; //3an är en guess på tid
		} else {
			animateRun=false;
			++currentCtrl;
			mainPath.removeSegments();
			setPathBkg();
			if (currentCtrl==olTrack.length) {
				targetView=rearPath.bounds.center;
				targetZoom=0.3;
				console.log('SLUT');
			} else {
				centerOnCtrl(currentCtrl);
				blockMouse=false;
			}
		}
		updateLegTimes();
	}
	// Animate view
	var viewDist=targetView-view.center;
	if (viewDist.length>1){
		viewDist.length=viewDist.length/25;
		view.center+=viewDist;
	}
	if (globals.zoomValue!=0) {
		targetZoom+=globals.zoomValue/5;
		globals.zoomValue=0;
	}
	var zoomDiff=view.zoom-targetZoom;
	if (zoomDiff>0.1 || zoomDiff<-0.1) {
		view.zoom-=zoomDiff/100;
	}
}


loadImages('',2);
drawTrack();
centerOnCtrl(currentCtrl);

