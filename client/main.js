tool.minDistance = 2;
view.zoom=0.1;
dragTolerance=100; //Distance from path to activate pan-mode
var replayMult=10;
var tickRate=50; //ms
var lastTime,tickTime;

var tickTimer;
var terrainMap;
var visibleMap;
var olTrack=new Array;
var currentCtrl=1;
var dragMap=false;

var mainPathBkg = new Path();
mainPathBkg.strokeWidth=6;
mainPathBkg.strokeColor='black';

var mainPath = new Path();
mainPath.strokeWidth=4;
mainPath.strokeColor='orange';

var oldPath = new Path();
var oldPathTail = new Path();
var rearPath = new Path(); //The small track showing running path (At finish this is the complete run)
rearPath.strokeColor='blue';
rearPath.strokeWidth=3;

var secondPath=new Path();

var tolerance = 20; //Tolerance for appending to current line drawing
var blockMouse = true; //Block mouse from line drawing input
var tail=false; //Is there a "tail" while cutting up path
var animateRun=false; //Is the current leg being animated
var targetView=view.center; // Sets target view
var targetZoom=0.5;
var followRunner=false; //Center view on runner as long as not view has been alterd

var	runner2=new Path.Circle(view.center,10);
runner2.visible=false;
runner2.strokeWidth=2;
runner2.strokeColor='black';
runner2.fillColor='red';	
var currentTime2=0;
var currentPace2=0;
var currentLocation2=0;
var currentDistans2=0;
var legTimes2=new Array;
var diffTime2=0;
var	totalTime2=0;

var	runner=new Path.Circle(view.center,10);
runner.visible=false;
runner.strokeWidth=2;
runner.strokeColor='black';
runner.fillColor='yellow';	
var currentTime=0;
var currentPace=0;
var currentLocation=0;
var currentDistans=0;
var legTimes=new Array;
var diffTime=0;
var	totalTime=0;

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

function limit(val,min,max) {
	return Math.min(Math.max(val,max),min);
}

function getSpeed(fromPosition,runDirectionVector){
	// Returns speed in m/s for the current location
	var ascendLength = 3;
	runDirectionVector.length = ascendLength;
	var currentPixel = terrainMap.getPixel(fromPosition);
	var forwardPixel = terrainMap.getPixel(fromPosition+runDirectionVector);
	var currentHeight = currentPixel.red*256;
	var forwardHeight = forwardPixel.red*256;
	var currentTerrain = currentPixel.green*25.6;
	var ascend = (forwardHeight-currentHeight)/ascendLength;
	var speed = (1.2-Math.pow(ascend*0.05+0.3,2))*currentTerrain; // in min/km
	//console.log(speed);

	return speed; //min/km
}

function loadImages(trackName,trackId){
	globals.setProgressLoad(10);
	var request = new XMLHttpRequest();
    request.open("GET", "public/tracks/"+trackName+".json", false);
    request.send(null)
    var my_JSON_object = JSON.parse(request.responseText);
    my_JSON_object.olGame.olTracks[trackId].trackControlPoints.forEach(
    	function(value,index){
    		olTrack.push(new Point(value.x,value.y));//new Point(value.x,value.y)
    	}
    );
	globals.setProgressLoad(20);

	$('<img />')
	    .attr('src', 'public/tracks/'+trackName+'-t.jpg')
	    .attr('id','terrainMap')
	    .load(function(){
    		globals.setProgressLoad(50);
	        $('#pics').append( $(this) );
			terrainMap=new Raster('terrainMap');
			terrainMap.visible=false;
			terrainMap.position=new Point(terrainMap.bounds.width/2,terrainMap.bounds.height/2);
			terrainMap.sendToBack();
			$('<img />')
			    .attr('src', 'public/tracks/'+trackName+'-m.jpg')
			    .attr('id','visibleMap')
			    .load(function(){
					globals.setProgressLoad(90);
			        $('#pics').append( $(this) );
					visibleMap=new Raster('visibleMap');
					visibleMap.visible=true;
					visibleMap.position=new Point(visibleMap.bounds.width/2,visibleMap.bounds.height/2);
					visibleMap.sendToBack();
					
					tickTimer=window.setInterval(onTick,tickRate);
					drawTrack();
					centerOnCtrl(currentCtrl);
					blockMouse=false;
					globals.startGame2();
				})
		})
}
window.globals.startGame=loadImages;


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
	} else {
		dragMap=true;
		if (event.point.getDistance(runner.position)<tolerance) { //If runner clicked follow runner view
			followRunner=true;
		} else {
			followRunner=false;
		};
	};
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
		mainPath.simplify(); //mainPath now includes the last leg
		sendToOtherPlayer(mainPath); //Send to main to chat window

		rearPath.addSegments(mainPath.segments); //Add main to the loong rear one
		mainPathBkg.removeSegments(); //Empty main

		currentDistans=currentDistans2=0;
		currentTime=currentTime2=0;
		currentLocation=currentLocation2=mainPath.getLocationAt(currentDistans).point;
		currentDistans=currentDistans2=2;
		runner.visible=runner2.visible=true;
		globals.waitForNextLeg();
		followRunner=true;
		targetZoom=0.5;
	}
}

function startNextLegFunc(){
		animateRun=true;
};
globals.startNextLeg=startNextLegFunc;

function sendToOtherPlayer(pathToSend){
	var currentPath=new Array();
	var currentPathStr="";
	for (var i=0;i<pathToSend.segments.length;i++){
		currentPath.push({x:Math.floor(pathToSend.segments[i].point.x),y:Math.floor(pathToSend.segments[i].point.y)});
		currentPathStr+=leftPad(Math.floor(pathToSend.segments[i].point.x),4);
		currentPathStr+=leftPad(Math.floor(pathToSend.segments[i].point.y),4);
	} 
	document.getElementById("chatText").innerHTML=currentPathStr;
}

function getFromOtherPlayerFunc(pathValues) {
	var numPoints=pathValues.length/8;
	secondPath.removeSegments();	
	secondPath.strokeWidth=4;
	secondPath.strokeColor='yellow';
	secondPath.visible=false;
	for (var i=0;i<numPoints;i++){
		secondPath.add(new Point(Number(pathValues.substr(i*8,4)),Number(pathValues.substr(i*8+4,4))));
	}
}
globals.getFromOtherPlayer=getFromOtherPlayerFunc;


function leftPad(number, targetLength) {
    var output = number + '';
    while (output.length < targetLength) {
        output = '0' + output;
    }
    return output;
}

function formatTime(timeToConvert) { //Time in secs, convert to mm:ss
	var mins=Math.floor(timeToConvert/60);
	var secs=Math.floor(timeToConvert-mins*60);
	return mins+":"+leftPad(secs,2);
}

function updateLegTimes() {
	totalTime=0;
	totalTime2=0;
	var value2;
	var legTableStr='<div class="legTable">';
	for (var index=1;index<currentCtrl+1;index++){
		if (legTimes[index]){value=legTimes[index]} else {value=0};		
		if (legTimes2[index]){value2=legTimes2[index]} else {value2=0};
		totalTime+=value;
		totalTime2+=value2;
		legTableStr+='<div class="legTableRow"><div class="legTableColLeft">Str.'+index+'</div><div class="legTableColRight">('+formatTime(value2)+')</div><div class="legTableColRight">'+formatTime(value)+'</div></div>';		
	};
	legTableStr+='<div class="legTableRow"><div class="legTableColLeft">Total tid</div><div class="legTableColRight">('+formatTime(totalTime2)+')</div><div class="legTableColRight">'+formatTime(totalTime)+'</div></div>';
	legTableStr+='</div><br>';
	if (animateRun) {legTableStr+='(currentPace='+Math.floor(currentPace)+'min/km)'};
	document.getElementById("dialogText").innerHTML=legTableStr;
}

function onTick(){
	var cTime=Date.now();
	tickTime=cTime-lastTime;
	lastTime=cTime;
	 //Old onFrame
	// Animate the run //Check order of events
	if (animateRun) {
		if (secondPath.length>2) {//2nd player active
			if (currentDistans<mainPath.length && diffTime>=0){ //p1 still running
				currentLocation=mainPath.getLocationAt(currentDistans).point;
				currentPace=getSpeed(currentLocation,mainPath.getTangentAt(currentDistans));
				currentDistans+=(1/(currentPace*0.06))*(tickTime/1000)*replayMult;	// 1/(speed*0.06); Convert to m(pixel)/s 
				runner.position=currentLocation;
				if (followRunner) {targetView=runner.position};
				currentTime+=(tickTime/1000)*replayMult;
				legTimes[currentCtrl]=currentTime;
			} else {
				diffTime+=(tickTime/1000)*replayMult;
			};
			if (currentDistans2<secondPath.length && diffTime2>=0){ //p2 still running
				currentLocation2=secondPath.getLocationAt(currentDistans2).point;
				currentPace2=getSpeed(currentLocation2,secondPath.getTangentAt(currentDistans2));
				currentDistans2+=(1/(currentPace2*0.06))*(tickTime/1000)*replayMult;	// 1/(speed*0.06); Convert to m(pixel)/s 
				runner2.position=currentLocation2;
				currentTime2+=(tickTime/1000)*replayMult;
				legTimes2[currentCtrl]=currentTime2;
			} else {
				diffTime2+=(tickTime/1000)*replayMult;
			};
			if (currentDistans>=mainPath.length && currentDistans2>=secondPath.length){ //Noones still running
				diffTime=totalTime2-totalTime;
				diffTime2=totalTime-totalTime2;
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
		} else {
			if (currentDistans<mainPath.length){
				currentLocation=mainPath.getLocationAt(currentDistans).point;
				currentPace=getSpeed(currentLocation,mainPath.getTangentAt(currentDistans));
				currentDistans+=(1/(currentPace*0.06))*(tickTime/1000)*replayMult;	// 1/(speed*0.06); Convert to m(pixel)/s 
				runner.position=currentLocation;
				if (followRunner) {targetView=runner.position};
				currentTime+=(tickTime/1000)*replayMult;
				legTimes[currentCtrl]=currentTime;
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
		}
		updateLegTimes();
	}
}

function onFrame(event) {
	// Animate view
	var viewDist=targetView-view.center;
	if (viewDist.length>1){
		viewDist.length=viewDist.length/25;
		view.center+=viewDist;
	}
/*	if (globals.zoomValue!=0) {
		targetZoom+=globals.zoomValue/5;
		globals.zoomValue=0;
	}*/
	globals.zoomValue=view.zoom*5;
	globals.setZoom();
	var zoomDiff=view.zoom-targetZoom;
	if (zoomDiff>0.1 || zoomDiff<-0.1) {
		view.zoom-=zoomDiff/10;
	}
}

function setZoomAppFunc(val) {
	targetZoom=val/5;
}
globals.setZoomApp=setZoomAppFunc;

/*var testTick;
var testVal;
function proggTest() {
	testTick=window.setInterval(proggTestTick,1000);
	testVal=0;
}

function proggTestTick() {
	testVal+=10;
	globals.setProgressLoad(testVal);
}


globals.startGame=proggTest;*/
