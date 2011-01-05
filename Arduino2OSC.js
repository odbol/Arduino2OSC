autowatch = 1;
outlets = 7;
inlets = 5;


//sorry about the messy code; this used to be another project! - Tyler


//for include code at bottom
var includes = "";
/* have to include this at bottom of file since max gives JS errors otherwise!
include("xorax_serialize.js");
eval(includes);         // initialise included code
includes = ""; //clear buffer
*/
//these control the lengths of automator recordings
const MAX_AUTOMATOR_REC_BUFFER = 50000;
const MIN_AUTOMATOR_REC_BUFFER = 10; //this is so the user can tap z to stop the animation

const ACCELERATION_THRESHOLD = 0.1; //TODO: adjust!

const ACCEL_MIN_WAND = 114; // the point where the accelerometer is at maxmium negative acceleration
const ACCEL_ZERO_WAND = 131; // the point where the accelerometer is at zero acceleration
const ACCEL_MAX_WAND = 200; // the point where the accelerometer is at maximum positive acceleration

const ACCEL_MIN_NUNCHUK = 108; // the point where the accelerometer is at maxmium negative acceleration
const ACCEL_ZERO_NUNCHUK = 126; // the point where the accelerometer is at zero acceleration
const ACCEL_MAX_NUNCHUK = 150; // the point where the accelerometer is at maximum positive acceleration

const MAX_CUT_INTERVAL = 20; //the maximum amount of time it takes for a cut gesture fade



//enable slow mo for movies
const SLOWEST_MOVIE_RATE = 0.1;	     


const OUTLET_DROPDOWN = 1;
const OUTLET_OSC = 0;
const OUTLET_SENSOR_UI = 2;

const NUM_DROPDOWNS = 4;
const DROPDOWN_NULL_VAL = "--"

const COL_NAME_ROTATION = 0;
const COL_NAME_X = 1;
const COL_NAME_Y = 2;

//set to true to print debug messages
var isDebug = false;
//isDebug = true;


// global variables for loading presets
var loadPreset1;
var loadAutomator1;
var loadPresetConstructorArray = [];




///// RESOLUME AVENUE OSC ///////// 
/*
I added the following 'wildcards' for OSC control.
- Use '/activeclip/' to control the currently selected clip. Instead of '/layer#/clip#/'.
- Use '/activelayer/' to control the currently selected layer. Instead of '/layer#/'.
- Use '/activetrack/' to control the currently selected track. Instead of '/track#/'. 

http://www.resolume.com/avenue/manual/
http://resolume.com/forum/viewtopic.php?f=5&t=4226&start=40
http://www.resolume.com/forum/viewtopic.php?f=13&t=5632&start=10
*/
var dropdownOpts = [];

var avenueRouteOpts = [];


var avenueVidParams = [
			  "position/speed ${0}",
			  "position/direction ${0}",
			  "position/values ${0}",
			  "connect 1",
			  "opacity/values ${0}",
			  "width/values ${0}",
			  "height/values ${0}",
			  "scale/values ${0}",
			  "positionx/values ${0}",
			  "positiony/values ${0}",
			  "rotatex/values ${0}",
			  "rotatey/values ${0}",
			  "rotatez/values ${0}",
			  "anchorx/values ${0}",
			  "anchory/values ${0}",
			  "anchorz/values ${0}", 
			  //more not in doc:
			  "rscale/values ${0}",
			  "gscale/values ${0}",
			  "bscale/values ${0}"
			  ];
			  
var avenueAudioParams = [
			  "pitch/values ${0}",
			  "position/direction ${0}",
			  "position/values ${0}"];		  

var avenueVidOpts = {"video": avenueVidParams,
					 "clip${0}": avenueVidParams,
					 "audio": avenueAudioParams};

//control effects per layer: /layer#/link[1-6]/values
//turn off: /layer#/video/effect1/bypassed 0
//all effects: /layer1/video/effect1/param2/values $1

var avenueVidEffectParams = ["opacity/values ${0}"];

//holds the names of each dropdown group column
var dropdownCols = [COL_NAME_ROTATION, COL_NAME_X];

//holds the names of each dropdown group (button names)
var dropdownGroups = [0, 1, 2, 3, 4, 5];

//holds the states of each dropdown group per column. 
//  key:   colName
//  value: 
//      key:   groupName
//      value: [groupName, dropValue1...dropValueN]
var dropdownStates = {};


//initializes our internal arrays on startup.
function initDropdownValues() {
  dropdownStates = {};
  for (var i in dropdownCols) {
  debugPrint("\ndropdownstates[" + i + "]");
  	dropdownStates[i] = {};
  }

  avenueVidEffectParams = ["opacity/values ${0}"];
  for (var i = 1; i <= 30; i++) 
    avenueVidEffectParams.push("param" + i + "/values ${0}");

  avenueRouteOpts = [DROPDOWN_NULL_VAL, "composition"];
  for (var i = 1; i <= 4; i++) {
    avenueRouteOpts.push("layer" + i);

    avenueVidOpts["video/effect" + i] = avenueVidEffectParams;
  }
  avenueRouteOpts.push("activeclip");

  for (var i = 1; i <= 6; i++) 
    avenueVidOpts["link" + i + "/values ${0}"] = null;

  dropdownOpts[0] = avenueRouteOpts;
  dropdownOpts[1] = avenueVidOpts;
 
  debugPrint("\ninit dropdown values: " + avenueVidEffectParams);
}

//resets the given dropdown group to defaults
function initDropdownGroup(colName, groupName) {  
	debugPrint("\ninitdropdownGroup(" + colName + ", " + groupName);
  //reset internal states
  dropdownStates[colName][groupName] = [null, null, null, null];

  //clear all and ready to fill
  for (var i = 0; i < NUM_DROPDOWNS; i++) {
    outlet(OUTLET_DROPDOWN, colName, groupName, i, "clear");
  }

  //init first dropdown
  for (var j = 0; j < dropdownOpts[0].length; j++) {
    outlet(OUTLET_DROPDOWN, colName, groupName, 0, "append", dropdownOpts[0][j]);
  }

  //init rest
  var firstIdx = null;
  for (var j in dropdownOpts[1]) {
    if (firstIdx == null)
      firstIdx = j;
    outlet(OUTLET_DROPDOWN, colName, groupName, 1, "append", j);
  }

  /* dbug
  for (k in avenueVidEffectParams)
    debugPrint("avenueVidEffectParams : " + avenueVidEffectParams[k]);
  */

  //init following based on above selected
  refreshDropdownGroup([colName, groupName, dropdownOpts[0][0], firstIdx, dropdownOpts[1][firstIdx][0]]);
}

//curValues is an array of the colName, groupName, then the current values of each dropdown in the group.
//DEPRICATED: not true: pass null to skip changing that dropdown's value.
function refreshDropdownGroup(curValues) {
  var dIdx = curValues[3];
  debugPrint("\nrefreshing " + curValues + " dIdx = " + dIdx);
 
  var colName = curValues[0];
  var groupName = curValues[1];

  //disable output while we change values so we don't enter infinite recursion!
  outlet(OUTLET_DROPDOWN, colName, groupName, "gate", 0);

  //add all new values to dropdown.
  //also check on some values to see if they are still valid
  outlet(OUTLET_DROPDOWN, colName, groupName, 2, "clear");
  var firstIdx = null;
  var isCurVal4Valid = false;
  for (var j in dropdownOpts[1][dIdx]) {
    if (firstIdx == null)
      firstIdx = j;
      
    if (dropdownOpts[1][dIdx][j] == curValues[4])
    	isCurVal4Valid = true;

    outlet(OUTLET_DROPDOWN, colName, groupName, 2, "append", dropdownOpts[1][dIdx][j]);
  }
  
  //replace last curValue with new, valid value, if they changed the second one
  if (dropdownStates[colName][groupName][3] != curValues[3]) {
  	if (!isCurVal4Valid) {
		if (firstIdx)
		  curValues[4] = dropdownOpts[1][dIdx][firstIdx];
		else
		  curValues[4] = null;
	}
  }

  //now set all the dropdowns to their last values
  for (var i = 2; i < curValues.length; i++) {
    if (curValues[i]) {
      debugPrint("\ncurValue[" + i + "] = " + curValues[i]); 
      outlet(OUTLET_DROPDOWN, colName, groupName, i - 2, "setsymbol", curValues[i]);
    }
  }

  //now save the current values as an internal state (man this is annoying. where's jQuery for Max!?!?!)
  dropdownStates[colName][groupName] = curValues;    

  //make sure the pak list has the latest from ALL dropdowns in group!
  for (var i = 0; i < NUM_DROPDOWNS; i++) {
    outlet(OUTLET_DROPDOWN, colName, groupName, i, "bang");
  }

  //enable output again
  outlet(OUTLET_DROPDOWN, colName, groupName, "gate", 1);
}



//////////////////////////////
// Arudino Sensor UI states //
//////////////////////////////

const SENSOR_UI_CUTOFF_DROPDOWN = 6;

//holds the states of each sensor UI element per group.
//      key:   groupName
//      value: [groupName, dropValue1...dropValueN]
var sensorUIStates = {};

function initSensorUIValues() {
	for (var i in dropdownGroups) {
		var state = [];
		for (var j = 0; j < 10; j++) {
			var val = 0;
			
			if (j == 8)
				val = 1;
			
			state.push([i, j, val]);
		}
  		sensorUIStates[i] = state; //[null, null, null, null, null, null, null, null, null, null];
  	}
}

function initSensorUIValuesFromUI() {
	for (var i in dropdownGroups) {
		for (var j in sensorUIStates) {
			outlet(OUTLET_SENSOR_UI, i, j, "bang");
		}
  	}
}

//curValues is an array of the groupName, then the index and then current value of ONE UI element in the group.
function refreshSensorUIGroup(curValues) {
  debugPrint("\nrefreshing sensorUI " + curValues);
  
  if (!curValues) 
  	return;
  
  var groupName = curValues[0];
  var routeNum = curValues[1];

  //disable output while we change values so we don't enter infinite recursion!
  outlet(OUTLET_SENSOR_UI, groupName, "gate", 0);

  //add all new values to sensor ui elements.
  //for (var i = 1; i < curValues.length; i++) {
  var i = 2;
    if (curValues[i]) {
      debugPrint("\ncurValue[" + i + "] = " + curValues[i]); 
      
      //update the UI element's value based on its type
      //switch(sensorUITypes[i]) {
      //	case "slider", "switch":
      		outlet(OUTLET_SENSOR_UI, groupName, routeNum, curValues[i]);
      //		break;
      //	case "dropdown":
      //		outlet(OUTLET_SENSOR_UI, groupName, i - 1, "set", curValues[i]);
      //		break;
      //}
    }
  //}  
 
  //now save the current values as an internal state (man this is annoying. where's jQuery for Max!?!?!)
  sensorUIStates[groupName][routeNum] = curValues;

  //enable output again
  outlet(OUTLET_SENSOR_UI, groupName, "gate", 1);
}

function saveSensorUIGroup(curValues) {
  debugPrint("\nsaving sensorUI " + curValues);
 
  if (!curValues) 
  	return;
  	
  var groupName = curValues[0];
  var routeNum = curValues[1];

  //now save the current values as an internal state (man this is annoying. where's jQuery for Max!?!?!)
  sensorUIStates[groupName][routeNum] = curValues;
}




//build a proper OSC path from the internal state of the given dropdown, or returns
//null on error or empty state
//state is an array of values to join into a path.
function getOSCPathFromDropdown(state) {
	var oscCmd = "";
	for (var j = 2; j < state.length; j++) { //skip the dropdown columnName and groupName
		if (state[j] && state[j] != "null" && state[j] != DROPDOWN_NULL_VAL)
			oscCmd += "/" + state[j];
		else 
			break;
	}
	
	if (oscCmd.length > 1) {
		//oscCmd += "/values";
	 
		return oscCmd;
	}
	else
		return null;	     
}

//replaces all occurences of variables "${varName}" in oscPath
//with the respective values in valuesArray and returns a valid OSC command array of [path, value]
function substituteOSC(oscPath, valuesArray) {
	if (!oscPath)
		return null;
		
	for (var j in valuesArray) {
		oscPath = oscPath.replace(new RegExp("\\$\\{" + j + "\\}", "g"), valuesArray[j]);
	}
	
	if (oscPath.length > 1) {
		//oscCmd += "/values";
	 
	 	//post(oscPath.split(" ").join("|"));
	 	
	 	//must convert all string values to floats if possible
	 	var oscPathSplit = oscPath.split(" ");
		var oscCmd = [];
		for (var i in oscPathSplit) {
			var num = parseFloat(oscPathSplit[i]);
			
			if (isNaN(num))
				oscCmd.push(oscPathSplit[i]);
			else
				oscCmd.push(num);
		}
		
		return oscCmd;	
	}
	else
		return null;	     
}

//sendAndResetOSCBuffer() sends all collected OSC messages (from sendOSC())
//in a bundle and resets the buffer.
var oscBufferFull = false;
function sendAndResetOSCBuffer(routeNum) {
  //debugPrint("\nsendAndResetOSCBuffer(" + routeNum + ", " + oscBufferFull);
  if (oscBufferFull)
    outlet(routeNum, "bang");

  oscBufferFull = false;
}

//sends an OSC message through the given routeNum.
//oscMsg can be a string or an array of strings.
//buffers the messages to send them all in a bundle at the end
function sendOSC(routeNum, oscMsg) {
  outlet(routeNum, oscMsg);
  //debugPrint("\nsendOSC(" + routeNum + ", " + oscMsg);
  oscBufferFull = true;
}






//this is the outlet that feeds back into the wii object
var wiiOutlet = outlets - 1;
var presetLoaderOutlet = outlets - 2;

var clips; //holds an effects array that is being maniuplated
//var effects; //holds effects for a certain clip


var mixer;

//holds an array of PresetQueue objects for each layer.
var presetQueues;

var wand;
var curButtons;
var nunchuk;

var plusDown; //indicates plus is held down

var isCutting = false; //indicates holding C to cut mixer


var testMod = 0; //used for testing parameters autogenerated by viideoifier.py


function debugPrint(msg) {
	if (isDebug)
		post(msg);
}

//this returns a copy of the object what.
//stolen from: http://www.irt.org/script/879.htm
function cloneObject(what) {
    for (i in what) {
        if (typeof what[i] == 'object') {
            this[i] = new cloneObject(what[i]);
        }
        else
            this[i] = what[i];
    }
}

//returns the first key of the given associative array
function getFirstKey(obj) {
  for (var j in obj) 
    return j;
}

//sets respective LEDs to on (1) or off (0).
function setLEDs(one, two, three, four) {
  //post("should set LEDS here");
  outlet(wiiOutlet, "led", one, two, three, four);
}

//returns a name with a randomized number at the end
function getRandomName() {
   var randNum =  Math.floor(max.time);
   return randNum.toString().slice(-5);
}

//returns a filehandle to an opened file for writing.
//if no filename specified, it makes one up.
function openFile(fileName) {
  if (fileName == undefined || fileName == "") {
    var randName = getRandomName();
    fileName = "auto" + randName + ".js";
  }
  f = new File(fileName, "write", "TEXT");
  post("\nopened file " + f.filename);
 
  return f;
}

function saveToFile(f, txt) {
  if (f == null || !f.isopen) {
    f = openFile();
  }
  f.writestring(txt);

  return f;
}

function closeFile(f) {
  if (f != null) {
    f.close();
    post("\nclosed file " + f.filename);
  }

  f = null;
}


//SCALING UTILITIES


//scales a number to fit within the new extrema.
//if hardCutoff is true, it will not exceed the extrema
function scaleRange(num, oldMin, oldMax, newMin, newMax, hardCutoff)
{
  var n =  ((num - oldMin) / ((oldMax - oldMin) / (newMax - newMin))) + newMin;
  if (hardCutoff == true) {
    if (n < newMin) 
      n = newMin;
    else if (n > newMax)
      n = newMax;
  }
// post("\nscaleRange(" + num + " = " + n + " < " + newMax);
  return n;
}

//scales a number using different scales depending if num is greater or less than the zero point oldZero.
//if hardCutoff is true, it will not exceed the extrema
function scaleWeightedRange(num, oldMin, oldZero, oldMax, newMin, newMax, hardCutoff) {
  var newZero = scaleRange(0.5, 0, 1, newMin, newMax);

  if (num > oldZero) 
    return scaleRange(num, oldZero, oldMax, newZero, newMax, hardCutoff);
  else
    return scaleRange(num, oldMin, oldZero, newMin, newZero, hardCutoff);
}

function scaleIR(num, min, max) {
  /*
  range = (num + 1.0) / 2.0;
  return (range * (max - min)) + min;*/
  return scaleRange(num, -1.0, 1.0, min, max);
}

function scaleIRAngle(num, min, max) {
  //post("\nwas:" + (((num + 1.5707965 / 3.141593) * (max - min)) + min));
  /*range = (num + 1.5707965) / 3.141593;
  return (range * (max - min)) + min;
*/
  return scaleRange(num, -3.141593, 3.141593, min, max);
}

function scaleMotion(num, min, max) {
  /*range = (num - 60.0) / 130.0;
  return (range * (max - min)) + min;*/
  return scaleRange(num, 10.0, 130.0, min, max);
}






//this is which clip we are currently manipulating
//it is controlled by the d pad. you can press it once to select,
//or hold one or more directions down to manipulate two at once. NOT
var curClip;
function setCurClip() {
  if (curButtons != null) {
    if (curButtons.down) {		
      setLEDs(0,0,1,0);
      curClip = getLayerIdxFromDPad(curButtons);
    }
    if (curButtons.up) {
      setLEDs(1,0,0,0);	
      curClip = getLayerIdxFromDPad(curButtons);
    }
    if (curButtons.left) {
      setLEDs(0,0,0,4);	
      curClip = getLayerIdxFromDPad(curButtons);
    }
    if (curButtons.right) {
      setLEDs(0,1,0,0);		
      curClip = getLayerIdxFromDPad(curButtons);
    } 
  }	
  //post("curClip: " + curClip + "\n");	
}

var curEffect;
function setCurEffect() {
  curEffect = 0;
  if (nunchuk != null) {
    curEffect = getLayerIdxFromDPad(nunchuk);
  }
}


//returns the layer index for the direction being held down on the given buttons object
function getLayerIdxFromDPad(buttons) {
  if (buttons.down) {
    return 3;		
  }
  if (buttons.up) {
    return 1;	
  }
  if (buttons.left) {
    return 4;	
  }
  if (buttons.right) {
    return 2;		
  } 

  return 0;
}



///////////////////////////////////////////////////////////////////////////
//buttons class
function Buttons(a) {
  this.refresh(a);
}
Buttons.prototype.src;
Buttons.prototype.a;
Buttons.prototype.b;
Buttons.prototype.one;
Buttons.prototype.two;
Buttons.prototype.left;
Buttons.prototype.right;
Buttons.prototype.up;
Buttons.prototype.down;
Buttons.prototype.minus;
Buttons.prototype.plus;
Buttons.prototype.home;
Buttons.prototype.refresh = function (a) {  
  this.src = a; //TODO: remove this and use JSON instead!

  var n = a[2];

  this.two = n & 1;
  this.one = n & 2;
  this.b = n & 4;
  this.a = n & 8;
  this.minus = n & 16;
  this.home = n & 128;
  this.left = n & 256;
  this.right = n & 512;
  this.down = n & 1024;
  this.up = n & 2048;
  this.plus = n & 4096;
};




///////////////////////////////////////////////////////////////////////////
//Automator class
//controlInstance is a control or effect object to automate.
//if oscillate is true, once the recording ends it runs backwards, 
//otherwise it will start from the begining.
function Automator(controlInstance, oscillate) {
  this.control = controlInstance;

  this.commands = new Array();
  this.buttons = new Array();
  this.curCommand = -1;

  this.oscillate = oscillate;
  this.reverse = false;
}
Automator.prototype.oscillate;

//indicates if the loop is currently oscillating backwards
Automator.prototype.reverse;

//this is a pointer to the control or effect asscociated with this automator
Automator.prototype.control;

Automator.prototype.isRecording;

//this is an array of recorded input arrays
Automator.prototype.commands; 
//this is an array of recorded buttons
Automator.prototype.buttons; 
//this is an array of recorded nunchuk buttons
//Automator.prototype.nunchuk; 

//index in the command arrays
Automator.prototype.curCommand; 

//int keeps track of the frameskip rate (for acceleration of automations)
Automator.prototype.curRate = 1;

//runs recorded commands in a loop
Automator.prototype.run = function(a, b) {
  // post("auto.running: " + this.isRecording + " || " + this.commands.length + "\n");
  if (this.isRecording || this.commands.length < MIN_AUTOMATOR_REC_BUFFER)
    return;
  
  //figure out rate of frameskip (1 is no frames skipped)
  //and slowly reduce frameskip to 0.
  if (this.curRate > 1) {
    this.curRate--;
    //debugPrint("\nnew curRate: " + this.curRate);
  }
  else
    this.curRate = 1;
 

  if (this.reverse) {
    this.curCommand -= this.curRate;
    if (this.curCommand < 1) {
      this.reverse = false;
      this.curCommand = 0;
    }
  }
  else {
    this.curCommand += this.curRate;
    if (this.curCommand >= this.commands.length) {
      if (this.oscillate) {
	 this.curCommand = this.commands.length - 2;
	 this.reverse = true;
      }
      else
	 this.curCommand = 0;
    }
  }
  // debugPrint("running " + this.curCommand + " on " + this.buttons[this.curCommand].b + "\n");
  this.control.run(this.commands[this.curCommand], this.buttons[this.curCommand]);
}

//records commands for later use.
//takes a (wii input) and b (curButtons) to record.
Automator.prototype.record = function(a, b) {
  if (++this.curCommand > MAX_AUTOMATOR_REC_BUFFER) {
    post("reached record limit");
    this.stopRecording();
    return;
  }
  
  this.isRecording = true;
  this.commands.push(a);
  this.buttons.push(new cloneObject(b));
}
Automator.prototype.stopRecording = function() {
  post("stopped recording");
  this.isRecording = false;
}
//saves current automation to filehandle f
//if f is provided then it will not write a loading function, just the member arrays.
Automator.prototype.save = function(f) {
  var isStandAlone = false;
  if (!f) {
    isStandAlone = true;
    f = openFile(this.outletNum + "-" + this.routeNum + "automator" + getRandomName() + ".js");

    debugPrint("serializing commands:\n");
    if (this.control.file != undefined) {
      saveToFile(f, "\n//for effect: " + this.control.file + "\n");
    }
    saveToFile(f, "\nloadAutomator1 = function(theEffect) {\n");
    saveToFile(f, "	  theEffect.automator = new Automator(theEffect, true);\n");
    saveToFile(f, "	  var buttonsA = theEffect.automator.buttons;\n");
    saveToFile(f, "	  var commandsA = theEffect.automator.commands;\n");
  }

  //save automator arrays
  for (var k = 0; k < this.commands.length; k++) {
    saveToFile(f, "	  commandsA.push(unserialize(" + serialize(this.commands[k]) + "));\n");
  }
  saveToFile("\n");
  for (var k = 0; k < this.buttons.length; k++) {
    saveToFile(f, "	  buttonsA.push(new Buttons(" + this.buttons[k].src + "));\n"); //TODO: write out JSON
  }

  if (isStandAlone) {
    saveToFile(f, "	  return theEffect.automator;\n};\n\n");
    closeFile(f);
  }
}




///////////////////////////////////////////////////////////////////////////
//Control class
function Control(outletNum, routeNum) {
  this.routeNum = routeNum;
  this.outletNum = outletNum;
}

Control.prototype.outletNum;
Control.prototype.routeNum;

//this is a pointer to the automator.
//if it is not null, the automator gets run instead of the run() function.
//in turn it will run this object's run() function, but with pre-recorded 
//values instead of live user input.
Control.prototype.automator;

//this is the function to run
Control.prototype.run;

//this should always be run at the begining of the run() function
Control.prototype.run_super = function(a, buttons) {
  return;
}

//this triggers one frame of the automator, or whatever other
//behaviour might be happening (accleration, etc).
Control.prototype.runAutomation = function(a, buttons) {
  if (this.automator != null) {
    this.automator.run(a, buttons);
  }
}

//name of the function to create this object. (for writing preset files)
Control.prototype.constructor = "Control"; 

Control.prototype.isActive = true; //controls are always active (dummy value)

//this saves the effect's parameters as a preset to the filehandle f.
//it handles saving of the automation and other general members.
//it will call saveExtras() which should be overridden to save object-specific members.
//set preserveRouteNum for a control. false for an effect (maybe not necessary??) TODO
Control.prototype.save_super = function (f, preserveRouteNum) {
  if (!this.isActive)
    return;

	var openedFile = false;
  if (f == undefined) {
    var filename = this.outletNum + "-" + this.routeNum + "control" + getRandomName() + ".js";
  	post("\nopening preset file: " + filename); 
    f = openFile(filename);
  	openedFile = true;
  }

  //if routeNum is a string, we have to fix it for inclusion in the code.
  /*
  var routeNumSerialized = parseInt(this.routeNum);
  if (!(routeNumSerialized > 0))
      routeNumSerialized = "'" + this.routeNum + "'"
*/

  post("\nsaving control preset " + this.outletNum + "/" + this.routeNum);
  if (this["file"] != undefined) {
    saveToFile(f, "\n//for effect file: " + this.file);
  }
  saveToFile(f, "\n//for control: " + this.outletNum + "/" + this.routeNum + "\n");
  saveToFile(f, "\nfunction(outletNum, routeNum) {\n");
  
  if (preserveRouteNum) //control routeNums are special and should be preserved
  	saveToFile(f, "	  routeNum = " + serialize(this.routeNum) + "; \n");
  
  saveToFile(f, "	  var fx = new " + this.constructor + "(outletNum, routeNum);\n");
  //saveToFile(f, "	  fx.;\n");

  //save child class members
  this.saveExtras(f);

  //save automator
  if (this.automator != undefined) {
    saveToFile(f, "	  fx.automator = new Automator(fx, true);\n");
    saveToFile(f, "	  var buttonsA = fx.automator.buttons;\n");
    saveToFile(f, "   var commandsA = fx.automator.commands;\n");
    this.automator.save(f);
  }

  saveToFile(f, "\n      return fx;\n}\n");

	if (openedFile)
		closeFile(f);
		
  return f;
}
Control.prototype.save = function (f) {
	this.save_super(f, true);
}
//this saves the effect's parameters as a preset to the filehandle f.
//this is the default and for most effects should be overridden, 
//writing members specific to the "fx" object.
Control.prototype.saveExtras = function (f) {
  if (f == undefined)
    return;

  saveToFile(f, "\n      \n");
}
Control.prototype.dispose = function () {
  debugPrint("\ncontrol dispose");
}
Control.prototype.makeActive = function () {
  debugPrint("\ncontrol makeActive");
}

//TRIGGER FUNCTIONS
//triggers a reverse of the automation, if playing.
//this is generic to all controls with an animation.
Control.prototype.trigReverse = function(speed) {
  if (this.automator)
    this.automator.reverse = !this.automator.reverse;
}

//triggers an accelleration of the automation, if playing.
//speed is an int: 1 is normal.
//this is generic to all controls with an animation.
Control.prototype.trigBoost = function(speed, deceleration) {
  if (this.automator) {
    this.automator.curRate = Math.round(speed);
    //debugPrint("\ncurRate: " + this.automator.curRate);
  }
}
  
///////////////////////////////////////////////////////////////////////////
//effect class

function Effect(fileName, outletNum, routeNum) {
  this.file = fileName;
  this.routeNum = routeNum;
  this.outletNum = outletNum;
  
  //load the effect and get rid of the old one
  outlet(this.outletNum, new Array(this.routeNum, "dispose"));



  //don't load the effect until they run it.
  //outlet(this.outletNum, new Array(this.routeNum, "read", fileName)); 
  this.isActive = false;
}
Effect.prototype.file;
Effect.prototype.outletNum;
Effect.prototype.routeNum;
Effect.prototype.isActive;


//this is a pointer to the automator.
//if it is not null, the automator gets run instead of the run() function.
//in turn it will run this object's run() function, but with pre-recorded 
//values instead of live user input.
Effect.prototype.automator;

Effect.prototype.run; //this is the function to run

//this should always be run at the begining of the run() function
//it will only reload an effect if user is trying to use it (i.e. pressing buttons)
Effect.prototype.run_super = function(a, buttons) {
  if (!this.isActive && (buttons.a || buttons.b || buttons.one || buttons.two)) {
    this.makeActive();
  }
}

//turns on an effect
Effect.prototype.makeActive = function() {
    outlet(this.outletNum, new Array(this.routeNum, "read", this.file)); 
    this.isActive = true;  
}

//this temporarily disables the effect
Effect.prototype.dispose_super = function () {
  if (this.isActive) {
    this.automator = null; //stop automation from running on a disposed effect
    outlet(this.outletNum, new Array(this.routeNum, "dispose")); 
    this.isActive = false;
  }
}
//this temporarily disables the effect
Effect.prototype.dispose = function () {
  this.dispose_super();
}


//inherited from Control
Effect.prototype.runAutomation = Control.prototype.runAutomation;

//TRIGGER FUNCTIONS
Effect.prototype.trigReverse = Control.prototype.trigReverse;
Effect.prototype.trigBoost = Control.prototype.trigBoost;

//name of the function to create this object. (for writing preset files)
Effect.prototype.constructor = "Effect"; 

Effect.prototype.save_super = Control.prototype.save_super;

//this saves the effect's parameters as a preset to the filehandle f.
//it handles saving of the automation and other general members.
//it will call saveExtras() which should be overridden to save object-specific members.
Effect.prototype.save = function (f) {
	this.save_super(f, false);
}
//this saves the effect's parameters as a preset to the filehandle f.
//this is the default and for most effects should be overridden, 
//writing members specific to the "fx" object.
Effect.prototype.saveExtras = function (f) {
  if (f == undefined)
    return;

  saveToFile(f, "\n      \n");
}


///////////////////////////////////////////////////////////////////////////
//PresetQueue class

function PresetQueue() {
  this.queue = new Array();
  this.curIndex = 0;
}
PresetQueue.prototype.queue;
PresetQueue.prototype.curIndex;
PresetQueue.prototype.getNext = function(outletNum, routeNum) {
  if (this.queue.length > 0) {
    this.curIndex = ++this.curIndex % this.queue.length;

    return loadPreset(this.queue[this.curIndex], outletNum, routeNum);
  }

  return null;
}
PresetQueue.prototype.getPrev = function(outletNum, routeNum) {
  if (this.queue.length > 0) {
    if (--this.curIndex < 0) 
      this.curIndex = this.queue.length - 1;

    return loadPreset(this.queue[this.curIndex], outletNum, routeNum);
  }

  return null;
}
PresetQueue.prototype.add = function(filename) {
  this.queue.push(filename);
}












































//saves the states of all dropdowns to filename.
//if no filename is given, saves to a random filename.
function saveAllDropdowns(filename) {
	if(!filename || filename == "")
		filename = "WiiJ_presets_" + getRandomName() + ".js"

	post("\nsaving all presets to:" + filename);

	var f = openFile(filename);
	
	saveToFile(f, "\n//preset groups loaded into loadPresetConstructorArray:\n");
	saveToFile(f, "\nloadPresetConstructorArray = [");

	//build an array of preset constructor functions
	for (var i = 0; i < clips.length; i++) {
		if (i > 0)
			saveToFile(f, ",");
		saveToFile(f, "\n\t[");	//start array of effects per clip
		
    	for (var j = 0; j < clips[i].length; j++) {
      		var effect = clips[i][j];

			if (j > 0)
				saveToFile(f, ",\n");
      		effect.save(f);
    	}
    	
    	saveToFile(f, "\n\t]");
  	}
  	saveToFile(f, "\n];");

	closeFile(f);
}



///////////////////////////////////////////////////////////////////////////
// PRESET LOADERS
///////////////////////////////////////////////////////////////////////////

//loads a preset from a file and returns the new effect
function loadPreset(filename, outletNum, routeNum) {
  if (filename && filename != "") {
    includes = "";
    include(filename);
    eval(includes);         // initialise included code
    includes = ""; //clear buffer

    post("loading preset " + filename + " into " + outletNum + " " + routeNum);    

    return loadPreset1(outletNum, routeNum);
  }

  return null;
}

//loads and runs a preset group loader function.
function loadPresetGroup(filename, effects, outletNum) {
  if (filename && filename != "") {
    includes = "";
    include(filename); //should set loadPresetConstructorArray to an array of arrays of effect constructors!!! 
    eval(includes);         // initialise included code
    includes = ""; //clear buffer

    post("\nloading preset group " + filename + " into " + outletNum);    

    return loadPresetGroupHelper(outletNum, effects, loadPresetConstructorArray);
  }

  return null;
}


//preset loader
//takes an array of arrays of new CTL or FX object constructor functions (from the preset loader)
//and replaces the current effects in each clip with the new ones.
function loadPresetGroupHelper(outletNum, oldEffects, newEffects) {
  //replace current effects with new ones when appropriate
  for (var j = 0; j < newEffects.length; j++) {
	  	if (j >= oldEffects.length) {
			post("\nERROR: preset loading failed. there are too many new presets to fit! (invalid file?)");
			break;
		}
		
		for (var i = 0; i < newEffects[j].length; i++) {
			if (i >= oldEffects[j].length) {
				post("\nERROR: preset loading failed. there are too many new presets to fit! (invalid file?)");
				break;
			}
			
			var theEffect = oldEffects[j][i];
			
			var newOutletNum = theEffect.outletNum; //TODO or should this be the function's parameter???
			var newRouteNum = i + 1;
			
			debugPrint("\nchanging effect: " + i + " " + "outlet: " + newOutletNum + " route:" + newRouteNum);
			
			//don't load presets into movies! leave that to the GUI
			// if (newRouteNum != "movie") {
			
			//stop the old one and stop its automation for now
			oldEffects[j][i].dispose(); 
			
			//load the new preset with the old one's outlet and routing numbers
			var newPreset = new newEffects[j][i](newOutletNum, newRouteNum);
			
			//load the new one, if there is one.
			if (newPreset != null) {  
			  post("\nloaded effect");
			  oldEffects[j][i] = newPreset;
			  oldEffects[j][i].makeActive();
			}
			else {
			  post("\nno effect to load: disposed old effect");
			}
		  // }
		}
	}
  return oldEffects;
}



///////////////////////////////////////////////////////////////////////////
//Effects and Controllers






function oscCTL(outletNum, routeNum, colName) {
  var that = new Control(outletNum, routeNum);
  
  that.constructor = "oscCTL";
  
  that.colName = colName;

  //indicates if the sensor data should be inverted before using (marked by the GUI)
  that.isInverse = false;

  that.run = function(a, buttons) {
    this.run_super(a, buttons);
    
    //process ir 
    if (a[1] == 'ir') {
      //only output if ir is tracking
      if (a[5] > 0) {
	 
	 //run the effect for whichever button this is for
	 //this.routeNum IS the button!
	 if (buttons[this.routeNum]) {
	   var num = 0;
	   switch (this.colName) { //each column controls either x, y, or rotation of Wii controller
	   		case COL_NAME_ROTATION:
	   			num = scaleIRAngle(a[4], 0.0, 1.0);
	   			break;
	   		case COL_NAME_X:
	   			num = scaleIR(a[2], 0.0, 1.0);
	   			break;
	   		default:
	   			num = scaleIR(a[3], 0.0, 1.0);
	   }

	   //build a proper OSC path from the internal state of the dropdowns
	   var oscCmd = getOSCPathFromDropdown(dropdownStates[this.colName][this.routeNum]);
	   if (oscCmd) 
	   		sendOSC(this.outletNum, substituteOSC(oscCmd, [num]));
	 }


	   if (this.isInverse) {
	   		num = 1.0 - num;
	   }

	 /*

	 if (buttons.b) {
	   rot = scaleIRAngle(a[4], 0.0, 28.0);
	   outlet(this.outletNum, new Array(this.routeNum, "fade", rot));
	 }
	 if (buttons.two) {
	   rot = scaleIRAngle(a[4], 0.0, 7.0);
	   outlet(this.outletNum, new Array(this.routeNum, "rate", Math.round(rot)));
	 }
	 */
      }	
    }
  }

  //save dropdown state as well
  that.saveExtras = function (f) {
    if (f == undefined)
      return;
    
    saveToFile(f, "\n      fx.colName = " + serialize(this.colName) + ";");
    
    saveToFile(f, "\n      var dropdownState = " + serialize(dropdownStates[this.colName][this.routeNum], "'") + ";\n");
    //saveToFile(f, "\n      dropdownState[0] = " + this.colName + "; //replace old colName with this one when loading\n");
    saveToFile(f, "\n      dropdownState[1] = routeNum; //replace old routeNum with current when loading\n");
    saveToFile(f, "\n      refreshDropdownGroup(dropdownState);\n");
  }

  return that;
}

//for arduino sensor input
//inherits oscCTL
function sensorCTL(outletNum, routeNum, colName) {
  var that = new oscCTL(outletNum, routeNum, colName);
  
  that.constructor = "sensorCTL";
  
  //that.colName = colName;

  that.run = function(a, buttons) {
    this.run_super(a, buttons);
    
    //process analog sensor input (array of [sensor index, sensor value])
    var sensorIdx = a[0];//????? routeNum????
	//run the effect for whichever button this is for
	//this.routeNum IS the button!
	if (sensorIdx == this.routeNum) {
		var val = a[1];
		if (val > 0) { 
	
		 ///TODODOODODOD??????????
		 
		 //TODO!?!!
		 //this is where we might check the SENSOR_UI_CUTOFF_DROPDOWN to find out how we should process this.
		 //but it could also be done in max, in the sensor module itself. TODO!

		//debugPrint("\nrunning oscCTL: " + this.routeNum + ": " + oscCmd);
		var oscCmd = getOSCPathFromDropdown(dropdownStates[this.colName][this.routeNum]);
		if (oscCmd) 
			sendOSC(this.outletNum, substituteOSC(oscCmd, [val]));
	 }
    }
  }

  //save dropdown state as well
  that.saveExtras = function (f) {
    if (f == undefined)
      return;
    debugPrint("dropdownstates: " + this.colName +"]["+this.routeNum+"]:" + dropdownStates);
    
    
    saveToFile(f, "\n      fx.colName = " + serialize(this.colName) + ";");
    saveToFile(f, "\n      var dropdownState = " + serialize(dropdownStates[this.colName][this.routeNum], "'") + ";\n");
    saveToFile(f, "\n      var sensorUIState = " + serialize(sensorUIStates[this.routeNum], "'") + ";\n");
    //saveToFile(f, "\n      dropdownState[0] = " + this.colName + "; //replace old colName with this one when loading\n");
    saveToFile(f, "\n      dropdownState[1] = routeNum; //replace old routeNum with current when loading");
    //saveToFile(f, "\n      refreshSensorUIGroup[1] = routeNum; //replace old routeNum with current when loading\n");
    saveToFile(f, "\n      refreshDropdownGroup(dropdownState);\n");
    
    saveToFile(f, "\n      for (var j in sensorUIState) {");
    saveToFile(f, "\n      		debugPrint('\\n\\nrefreshing' + j);refreshSensorUIGroup(sensorUIState[j]);\n}");
  }

  return that;
}










//returns a velocity accelerated by a.
function accelerate(v, a) {
  //prevent overflow????
  if (v >= 65535 && a > 0.0)
    v = -65535;
  if (v <= -65535 && a < 0.0)
    v = 65535;

  return v + a;
}




//helper function for fadeLayer()
//for use with the Task to fade a given layer to black or to full.
function fadeLayerTask(l, r, m) {
  //whoever wrote the max JS task is retarded.
  var args = arguments[0];
  var layer = args[0];
  var rate = args[1];
  var stop = args[2];
  var newOpacity = this[layer] + rate;
  if ((rate < 0.0 && newOpacity <= stop) || (rate > 0.0 && newOpacity >= stop)) {
    this[layer] = stop;
    this.update();  
    arguments.callee.task.cancel();
  }
  else {
    this[layer] = newOpacity;
    this.update();
  }
}

//fades a layer smoothly 
//TODO: figure out amount automatically!!!
function fadeLayer(layer, toOpacity, interval) {
  if (layer != "") {
    var curOpacity = mixer[layer];

    var amount = (toOpacity - curOpacity) / interval;

debugPrint("\nfadeLayer(" + layer + ", " + toOpacity + ", " + amount + ", " + interval);

    var faderTask = new Task(fadeLayerTask, mixer, [layer, amount, toOpacity]);
    faderTask.interval = interval;
    faderTask.repeat();
  }
}

var myval=0;

if (jsarguments.length>1)
  myval = jsarguments[1];
 else
   //effects = new Array(sineFoldFX(0));
   loadbang();

function bang()
{
  //outlet(0,"myvalue","is",myval);
}


function msg_float(v)
{
  debugPrint("received float " + v + "\n");
  myval = v;
  bang();
}


function loadbang() {
  curClip = 0;
  curEffect = 0;

  curButtons = new Buttons(0);



  clips = new Array();

  //init sensor UI elements.
  initSensorUIValues();
  //initSensorUIValuesFromUI();

  //load values into dropdowns, and populate clips with control objects for each dropdownGroup
  initDropdownValues();
  for (var i in dropdownCols) {
	for (var j in dropdownGroups) {
    	initDropdownGroup(dropdownCols[i], dropdownGroups[j]);
    	clips.push(new Array(new sensorCTL(OUTLET_OSC, dropdownGroups[j], dropdownCols[i]))); 
  	}
  }

  //change dropdown column colors
  outlet(OUTLET_DROPDOWN, 1, "panels", "brgb", 235, 203, 95);
  //outlet(OUTLET_DROPDOWN, 2, "panels", "brgb", 228, 140, 241);	


  /*
  var effects1 = new Array();
  clips.push(effects1);

  var effects2 = new Array();
  clips.push(effects2);

  //loadAutomator1(effects2[0]);

  var effects3 = new Array();
  //Cellular Automata
  //effects3.push(new cursorCTL(3));
  //effects3.push(new caCTL(3, 2));
  
  //BFG
  //effects3.push(new fractalBFG(3, 1));
 
  //MOVIE
  clips.push(effects3);

  var effects4 = new Array();
  clips.push(effects4);
  */

  //initialize empty preset queues
  presetQueues = new Array();
  for (var i = 0; i < 4; i++) 
    presetQueues.push(new PresetQueue());
}


function anything()
{
  var a = arrayfromargs(messagename, arguments);

  if (inlet == 0) {
      //run all automations (and all effect)
      for (var i = 0; i < clips.length; i++) {
		 for (var j = 0; j < clips[i].length; j++) {
		   var effect = clips[i][j];
	
		   effect.run(a, curButtons); //run all effects since we don't have layers anymore!
		   effect.runAutomation(a, curButtons);
		 }
      }

      //finally send OSC bundle
      sendAndResetOSCBuffer(OUTLET_OSC); 
  }
  else if (inlet == 2) {
    //DROPDOWNS input
    var colName = a[0];
    var groupName = a[1];


    if (a[1] == "init")
      initDropdownGroup(colName, groupName);
    else {
      refreshDropdownGroup(a);

      //debug
      for (var l in dropdownStates)
      	for (var k in dropdownStates[l])
	 		debugPrint("\ndropdownStates[" + l + ", " + k +"] =" + dropdownStates[l][k]);
    }
  }
  else if (inlet == 3) {
    //BUTTON external commands
    if (a[0] == "Save") {
      if (a.length > 1)
      	saveAllDropdowns(a[1]);
      else
      	saveAllDropdowns();
    }
    else if (a[0] == "loadfile") {
      //loadPreset(a[1], OUTLET_OSC, dropdownGroups[0]);
      loadPresetGroup(a[1], clips, OUTLET_OSC);
    }
  }
  else if (inlet == 4) {
    //sensor UI input
    var groupName = a[0];

    if (a[1] == "init")
      initSensorUIGroup(colName, groupName);
    else {
      saveSensorUIGroup(a);
    }
  }  
}








//FROM:
//http://www.cycling74.com/forums/index.php?t=msg&goto=116405&rid=0&S=613f97801a23c3335a5bfbd14a77d1fd
// include.js               ****************************************************
// VERSION 0.4
// 
//******************************************************************************
// history
// ??/05/2007: v 0.1 : first version
// 08/08/2007: v 0.2 : first proper reference version
// 08/08/2007: v 0.3 : INCLUDEPATH and compiled/uncompiled handling
// 27/09/2007: v 0.4 : minor tidying and better comments
//******************************************************************************
// documentation
//      function : a standard javascript include handler (embed in js files)
//                can include file from local directory path or a global
//                directory path (default is set in INCLUDEPATH)
//                will search for a 'compiled' (ie stripped of whitespace/comments)
//                '.h.js' suffixed file first, then just the normal filename
//
//      author   : sean ahern (c) 2007
//
//
// usage example
//       var includes = "";      // set up include buffer
//       include("local");       // include local includefile 'local.h.js' or 'local.js' 
//       include("<global>");    // include global includefile 'global.h.js' or 'global.js'
//       eval(includes);         // initialise included code
//       includes = "";          // clear buffer
//
//******************************************************************************
   // --------------------------------------------------------- include function
   //----------------------------------------------
//include.local = 1;
function include(filename){
   var INCLUDEPATH = ".\\Cycling '74\\jsincludes\\";         //or wherever suits 
  
      
      length = filename.length;
      // determine full path for filename
      if ((filename.substring(0,1) == "<")){                 //< indicates global library
         if ((filename.substring(length-1,length) == ">")){  // well-formed global
            base_filename = INCLUDEPATH + filename.substring(1,length-1);
            compiled_filename = base_filename + ".h.js";
            raw_filename = base_filename + ".js";
         }else{                                            //badly formed global
            post("ERROR in include; malformed filename '",filename, "'\n");
            return;
         }
      }else{
         if ((filename.substring(length-1,length) == ">")){//badly formed include
            post("ERROR in include; malformed filename '",filename, "'\n");
            return;
         }else{
            compiled_filename = filename + ".h.js";
            raw_filename = filename;// really this is just stupid + ".js";
         }
      }

      //fix filenames that already had a .js extension
      //ADDED by Tyler, 3/16/08
      compiled_filename = compiled_filename.replace(".js.js", ".js");
      //raw_filename = raw_filename.replace(".js.js", ".js");

      // open file to copy into a string
      // prioritise the compiled version first
      file = new File(compiled_filename, "read");
      file.open();   
      if (!(file.isopen)){         
        file = new File(raw_filename, "read");
        file.open(); 
      }
      if (file.isopen){
         // read in lines of up to 120 chars at a time (compensates for strange filesize/buffer issue)
         // this is probably slower, but strings get weirdly truncated otherwise.
         fileposition = 0;
         while (fileposition < file.eof){
            chunkread = file.readline(120);
            includes = includes + chunkread + "\n";
	     //post("adding: " + chunkread, "\n");
            fileposition = file.position;
         }
         file.close(); 
      }else{      
         post("ERROR in include; cannot open ", raw_filename,  "\n");
      }
      //post("including: " + includes);

   }// end function include 
// =============================================================================
// end of code
// =============================================================================






//xorax_serialize.js:
/*
Returns a JSON string representing the given object. 

Stolen from:
http://www.sitepoint.com/blogs/2009/08/19/javascript-json-serialization/
*/

//if splitChar is defined, it will return a splitChar-deliniated 
//string split up among multiple lines, since Max can't read lines past a certain length!
function serialize (obj, splitChar) {
  var result;

	var t = typeof (obj);
	if (t != "object" || obj === null) {
		// simple data type
		if (t == "string") obj = '"'+obj+'"';
		result = String(obj);
	}
	else {
		// recurse array or object
		var n, v, json = [], arr = (obj && obj.constructor == Array);
		for (n in obj) {
			v = obj[n]; t = typeof(v);
			if (t == "string") v = '"'+v+'"';
			else if (t == "object" && v !== null) v = serialize(v);
			json.push((arr ? "" : '"' + n + '":') + String(v));
		}
		result = (arr ? "[" : "{") + String(json) + (arr ? "]" : "}") + "\n";
	}
 

  //return a split up string
  /*
  if (splitChar) {
    var splitResult = "";

    var splitLength = 30;

    var lastIdx = 0;
    var nextIdx = 0;
    //post("\nserializing and spliting " + lastIdx + " : " + nextIdx + " = " + result);
    while (lastIdx < result.length) {
      if (splitResult.length > 0)
	 splitResult += splitChar + " + \n\t" + splitChar;

      nextIdx = Math.min(lastIdx + splitLength, result.length);

      splitResult += result.substring(lastIdx, nextIdx);
      //post("\nserializing and spliting " + lastIdx + ": " + splitResult);
      lastIdx = nextIdx;
    }

    result = splitResult;
    //post("\nserialized and split " + result);
  }
  */

  return result;
}

function unserialize(txt){
return txt;
 
}

