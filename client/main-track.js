var visibleMap;
var olTrack=new Array;
var symbol;
view.zoom=0.5;
var activeCtrl=-1;
var bkgLayer=project.activeLayer;
var mainLayer=new Layer();

function loadImages(trackName,trackId){
    var request = new XMLHttpRequest();
    request.open("GET", "public/tracks/"+trackName+".json", false);
    request.send(null)
//	request.onreadystatechange = function() {
//		if ( request.readyState === 4 && request.status === 200 ) {
		    var my_JSON_object = JSON.parse(request.responseText);
		    my_JSON_object.olGame.olTracks[trackId].trackControlPoints.forEach(
		    	function(value,index){
		    		olTrack.push(new Point(value.x,value.y));//new Point(value.x,value.y)
		    	}
		    );
//		};
//	};
	bkgLayer.activate();
	visibleMap=new Raster('visibleMap');
	visibleMap.visible=true;
	visibleMap.position=new Point(visibleMap.bounds.width/2,visibleMap.bounds.height/2);
	visibleMap.sendToBack();
	terrainMap=new Raster('terrainMap');
	terrainMap.visible=false;
	terrainMap.position=new Point(visibleMap.bounds.width/2,visibleMap.bounds.height/2);
}

function drawTrack() {
	mainLayer.activate();
	project.activeLayer.removeChildren();
	var i;
	// Checks angle to first ctrl and draws triangle
	symbol=new Path();
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

function updateWidget() {
	var jsoncode;
	jsoncode='"trackControlPoints" : [<br>';
	for (i=0;i<olTrack.length-1; ++i){
		jsoncode+='{"x" : '+olTrack[i].x+', "y": '+olTrack[i].y+'},<br>';

	}
	jsoncode+='{"x" : '+olTrack[olTrack.length-1].x+', "y": '+olTrack[olTrack.length-1].y+'}]';
	document.getElementById("dialog").innerHTML=jsoncode;
}

function onMouseDown(event) {
	if (!event.modifiers.shift) {
		var i;
		for (i=0;i<olTrack.length; ++i){
			if (event.point.getDistance(olTrack[i])<30) {
				activeCtrl=i;
			}
		}
		if (activeCtrl <= -1) {
			olTrack.push=event.point;
			activeCtrl=olTrack.length;
			drawTrack();
		}
	}
}

function onMouseDrag(event) {
	if (event.modifiers.shift) {
		view.center-=event.delta;
	}
	if (activeCtrl!=-1) {
		olTrack[activeCtrl]=event.point;
		drawTrack();
		updateWidget();
	}
}

function onMouseMove(event) {
	var currentPixel = terrainMap.getPixel(event.point);
	var currentHeight = currentPixel.red*256;//*256;
	var currentTerrain = currentPixel.green*25.6;//*100;
	console.log('Höjd='+Math.floor(currentHeight)+' Terräng='+Math.floor(currentTerrain));
}

function onMouseUp(event){
	activeCtrl=-1;
}

loadImages('andtorp',2);
view.center=olTrack[1];
drawTrack();
