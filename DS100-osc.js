/* Chataigne Module for d&b audiotechnik DS100 OSC v1.2.0 (c) Mathieu Delquignies, 08/2020
===============================================================================
This file is a Chataigne Custom Module to remote control d&b audiotechnik DS100.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.
3. The name of the author may not be used to endorse or promote products
derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
===============================================================================
*/

/** 
 * Constants
 * 
 * Table of OSC strings from https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.0-en.pdf
 * Juce Javascript don't allow const so they are defined as global variable instead, see https://docs.juce.com/master/index.html
 */
var OSCDeviceName = "/dbaudio1/settings/devicename";
var OSCDeviceSerial = "/dbaudio1/fixed/sernr";
var OSCPing = "/ping";
var OSCPong = "/pong";
var OSCGnrlErr = "/dbaudio1/error/gnrlerr";
var OSCErrorText = "/dbaudio1/error/errortext";
var OSCDeviceClear = "/dbaudio1/device/clear";
var OSCRoomId = "/dbaudio1/matrixsettings/reverbroomid";
var OSCPreDelayFactor ="/dbaudio1/matrixsettings/reverbpredelayfactor";
var OSCRearLevel ="/dbaudio1/matrixsettings/reverbrearlevel";
var OSCOutputGain = "/dbaudio1/matrixoutput/gain/";
var OSCSceneNext = "/dbaudio1/scene/next";
var OSCScenePrevious = "/dbaudio1/scene/previous";
var OSCSceneRecall = "/dbaudio1/scene/recall/";
var OSCSpread = "/dbaudio1/positioning/source_spread/";
var OSCDelayMode = "/dbaudio1/positioning/source_delaymode/";
var OSCPosition = "/dbaudio1/coordinatemapping/source_position_xy/";
var OSCRevGain = "/dbaudio1/matrixinput/reverbsendgain/";
var OSCInputGain = "/dbaudio1/matrixinput/gain/";
var OSCChannelName = "/dbaudio1/matrixinput/channelname/";
var OSCSceneIndex = "/dbaudio1/scene/sceneindex";
var OSCSceneName = "/dbaudio1/scene/scenename";
var OSCSceneComment = "/dbaudio1/scene/scenecomment";
var OSCInputMute = "/dbaudio1/matrixinput/mute/";

/** 
 * Global variables
 */
var soundObjectsContainer;
var soundObjects = [];
var updateRate;
var OSCRx = true;
var pauseRx;
var inputMuteStates = [];
var getSoundObjects = false;
var getScenes = false;
var getEnSpace = false;

/* 	===============================================================================
*	Chataigne common functions
*	
*	See https://bkuperberg.gitbook.io/chataigne-docs/scripting/scripting-reference#common-functions
*	===============================================================================
*/

/**
 * This function is called automatically by Chataigne when you add the module in your Noisette.
 * Used for GUI initialisation, global OSC Rx management with callbacks and soundObjects container construction.
 */
function init() {
	// GUI setup
	setReadonly();
	collapseContainers();

	// Register global device OSC received messages to their callback functions (other datas are parsed with OSCevent function below)
	// See https://bkuperberg.gitbook.io/chataigne-docs/scripting/scripting-reference/module-scripts#module-specific-methods-the-local-object
	local.register(OSCDeviceName, "rxDeviceName");
	local.register(OSCDeviceSerial, "rxSerialNumber");
	local.register(OSCPong, "rxPong");
	local.register(OSCGnrlErr, "rxError");
	local.register(OSCErrorText, "rxErrorText");
	local.register(OSCSceneIndex, "rxSceneIndex");
	local.register(OSCSceneName, "rxSceneName");
	local.register(OSCSceneComment, "rxSceneComment");
	local.register(OSCRoomId, "rxRoomID");
	local.register(OSCRearLevel, "rxRearLevel");
	local.register(OSCPreDelayFactor, "rxPreDelayFactor");

	// Setup module container for Sound Objects values
	clearSoundObjects();
	// Add one soundObject container of values
	soundObject = addSoundObject();

	// Setup default reception update rate and get update states as in module GUI
	updateRate = local.parameters.updateRate.get();
	script.setUpdateRate(updateRate);
	getSoundObjects=local.parameters.getSoundObjects.get();
	getScenes=local.parameters.getScenes.get();
	getEnSpace=local.parameters.getEnSpace.get();

	// Initialize inputMuteStates array with 64 elements at "false" value (used in soloSO function)
	for (var i=0;i<=64; i++)
	{
		inputMuteStates.push(false);
	}
}

/**
 * This function is called automatically by Chataigne at updateRate period. 
 * Used to parse OSC received messages to soundObject container values
 * @param {integer} updateRate 
 */
function update(updateRate) {
	// for OSC inputs, sends commands to receive values, at specified updateRate
	// from now, update only one "soundObject0" object at a time
	// next, Scenes
	if(OSCRx)
	{
		updateSoundObject(soundObjectsContainer.getChild("soundObject0"));
		updateScenes();
		updateEnSpace();
	}
	else
	{
		// It happens just after sending OSC commands.
		// Wait 10x updateRate period to start Rx again,
		// To avoid infinite feedback loop between Chataigne value.parameter and DS100
		pauseRx=pauseRx+1;
		if (pauseRx==10)
		{
			pauseRx=0;
			OSCRx=true;
		}
	}
}

/**
 * This function is called automatically by Chataigne when a module parameter changes in GUI
 * @param {Parameters} param 
 */
function moduleParameterChanged(param)
{
	if(param.is(local.parameters.updateRate))
	{
		updateRate = local.parameters.updateRate.get();
		script.setUpdateRate(updateRate);
	}
	if(param.is(local.parameters.getSoundObjects))
	{
		getSoundObjects = local.parameters.getSoundObjects.get();
	}
	if(param.is(local.parameters.getScenes))
	{
		getScenes = local.parameters.getScenes.get();
	}
	if(param.is(local.parameters.getEnSpace))
	{
		getEnSpace = local.parameters.getEnSpace.get();
	}
	// Will add there in the future a parameter for number of sound objects containers, start in this version to try out only one "0" sound object
}

/**
 * This function is called automatically by Chataigne when a module value changes
 * @param {value} value 
 */
function moduleValueChanged(value)
{
	if(value.isParameter())
	{
		// Collect all soundObject parameters from Chataigne container and store them in local variables
		
		//var soundObject=soundObjects[0]; // maybe in next version we can have an array of soundObjects ? from now only one soundObject
		var soundObject = soundObjectsContainer.getChild("soundObject0");
		var id = soundObject.input.get();
		var coordinateMapping = soundObject.coordinateMapping.get();
		var pos2D = soundObject.position.get();
		var spread = soundObject.spread.get();
		var revGain = soundObject.reverb.get();
		var mode = soundObject.mode.get();
		var level = soundObject.level.get();
		var mute = soundObject.mute.get();
		script.log(value.name);
		// Value parser
		if (value.name=="coordinateMapping")
		{
			// from now do nothing ! will be used in coordinateMappingSourcePosition commands later
		}

		if (value.name=="input")
		{
			// input channel ID has chaged, so we need to update all the soundObject container values
			OSCRx=true; // be sure to Rx values
			local.send(OSCChannelName + id); // Retreive channel name string. From now, to speed up updateSoundObject and lower coms, this is done just here
		}
		
		if(value.name=="position")
		{
			coordinateMappingSourcePositionXY(coordinateMapping, id, pos2D);
		}
		if(value.name=="spread")
		{
			sourceSpread(id, spread);
		}
		if(value.name=="reverb")
		{
			reverbSendGain(id, revGain);
		}
		if(value.name=="mode")
		{
			sourceDelayMode(id, mode);
		}
		if(value.name=="level")
		{
			matrixInputGain(id, level);
		}
		if(value.name=="mute")
		{
			matrixInputMute(id, mute);
		}
		if(value.name=="roomID")
		{
			reverbRoomId(value.get());
		}
	} else // if not, it may be a container trigger button
	{
		if (value.name=="clickToUpdateAll")
		{
			// Send OSC message to retrieve Status container parameters from device
			local.send(OSCDeviceName);
			local.send(OSCDeviceSerial);
			local.values.ds100DeviceStatus.isThereAnybodyOutThere.set(false);
			local.send(OSCPing);
			local.send(OSCGnrlErr);
			local.send(OSCErrorText);
		}
	}
}

/**
 * Called when an OSC message is received
 * Parse received values 
 * @param {string} address 
 * @param {array} args 
 */
function oscEvent(address, args)
{
	var soundObject = soundObjectsContainer.getChild("soundObject0");
	// Parser works only with one actual soundObject, from now no filter on object ID, uses OSC jokers
	if(OSCRx)
	{
		if(local.match(address, OSCPosition+"*/*")) // This is a sound object positioning message
		{
			soundObject.position.set(args[0], args[1]);
		}
		else if (local.match(address, OSCInputGain+"*")) // this is a sound object (matrix input) level
		{
			soundObject.level.set(args[0]);
		}
		else if (local.match(address, OSCSpread+"*")) // this is a sound object spread value
		{
			soundObject.spread.set(args[0]);
		}
		else if (local.match(address, OSCRevGain+"*")) // this is a sound object reverb send gain value
		{
			soundObject.reverb.set(args[0]);
		}
		else if (local.match(address, OSCDelayMode+"*")) // this is a sound object delay mode value
		{
			/* when the Enum type will be 100% implemented
			var key;
			if (args[0]==0) key="off";
			if (args[0]==1) key="tight";
			if (args[0]==2) key="full";
			soundObject.mode.set(key);
			*/
			soundObject.mode.set(args[0]);
		}
		else if (local.match(address, OSCChannelName+"*")) // this is the channel name string
		{
			soundObject.channelName.set(args[0]);
		}
		else if (local.match(address, OSCInputMute+"*")) // this is the channel mute state
		{
			var receivedSOID = parseInt(address.substring(OSCInputMute.length, address.length));
			var soundObjectID = soundObject.input.get();
			if (receivedSOID==soundObjectID) // check if the received channel number match the actual soundObject input parameter
			{
				soundObject.mute.set(args[0]);	
			}
			else
			{
				// This is part of soloSO functionality. 
				// Should store mute states in inputMuteState array.
				// Still in construction
				//inputMuteStates[receivedSOID]=args[0];
				script.log("received" + receivedSOID + args[0]);
			}
		}
		else script.logWarning("OSC Event parser received unknown OSC address " + address + " " + args);
	}
}

/* 	===============================================================================
	Values.soundObjects container functions

	We choose a script constructor instead of JSON so maybe in the future may be we'll have several soundObjects or a manager
	===============================================================================
*/

/**
 * To clear of the soundObjects array and container, add a new empty one
 */
function clearSoundObjects() 
{
	soundObjects = [];
	local.values.removeContainer("soundObjects");
	soundObjectsContainer = local.values.addContainer("Sound Objects", "List of soundObjects");
}

/**
 * To add a new soundObject container to soundObjects container
 */
function addSoundObject() 
{
	var index = soundObjects.length;
	var soundObject = soundObjectsContainer.addContainer("Sound Object " + index );

	var channelName = soundObject.addStringParameter("ChannelName", "Matrix input name", "Object name");
	channelName.setAttribute("readonly", true);
	var coordinateMapping = soundObject.addIntParameter("coordinateMapping", "DS100 coordinate coordinate Mapping, 0 for default module setting, 1-4 for specific object setting", 0, 0, 4);
	var id = soundObject.addIntParameter("Input", "object ID, as DS100 Matrix inputs setup, from 1 to 64", 1, 1, 64);
	var position2D = soundObject.addPoint2DParameter("Position", "(x,y) position in coordinate mapping");
	var spread = soundObject.addFloatParameter("Spread", "object spread", 0, 0, 1);
	var reverb = soundObject.addFloatParameter("Reverb", "EnSpace send level", 0, -120, 24);
	/* 	When Enum paramter will be 100% implemented in Chataigne (still beta)
	var mode = soundObject.addEnumParameter("Mode", "Delay mode", "off", 0, "tight", 1, "full", 2);
		From now, use Int paramter instead : */
	var mode = soundObject.addIntParameter("Mode", "Delay mode", 0, 0, 2); 
	var level = soundObject.addFloatParameter("Level", "Matrix input level", 0, -120, 24);
	var mute = soundObject.addBoolParameter("Mute", "Matrix input mute", false);

	return soundObject;
}

/* 	===============================================================================
	Update functions, by module values container

	Send OSC commands, so DS100 will answers with the corresponding parameters
	Rx will be parsed by oscEvent()
	===============================================================================
*/

/**
 * Send OSC commands to retreive soundObject container parameters
 * @param {soundObject} soundObject 
 */
function updateSoundObject(soundObject)
{
	if(getSoundObjects)
	{
		var id = soundObject.input.get();
		var coordinateMapping = soundObject.coordinateMapping.get();
		if (coordinateMapping==0) {
			coordinateMapping=local.parameters.defaultCoordinateMapping.get();
		}
		{
			local.send(OSCPosition + coordinateMapping + "/" + id );
			local.send(OSCSpread + id);
			local.send(OSCInputGain + id);
			local.send(OSCRevGain + id);
			local.send(OSCDelayMode + id);
			local.send(OSCInputMute + id);
		}
	}
}

/**
 * Send OSC commands to retreive Scenes module container parameters
 */
function updateScenes()
{
	if(getScenes)
	{	
		local.send(OSCSceneIndex);
		local.send(OSCSceneName);
		local.send(OSCSceneComment);
	}
}

/**
 * Send OSC commands to retreive EnSpace module container parameters
 */
function updateEnSpace()
{
	if(getEnSpace)
	{
		local.send(OSCRoomId);
		local.send(OSCRearLevel);
		local.send(OSCPreDelayFactor);
	}
}

/*	===============================================================================
	Commands to send OSC messages to DS100
	===============================================================================
*/

/*	===============================================================================
	DS100 global commands
*/

/**
 * Clear all DS100 settings, with a OkCancelBox to confirm
 */
function deviceClear()
{
	if (util.showOkCancelBox("It will clear all device settings !", "Are you sure ?", "warning", "Yes, clear all values","Naaah"))
	{
		local.send(OSCDeviceClear);
	}
}

/**
 * Set the reverb room id
 * @param {integer} id (0=off, 1-9=room model)
 */
function reverbRoomId(id)
{
	RxPause();
	local.send(OSCRoomId, id);
}

/**
 * Set EnSpace reverb predelay factor
 * @param {float} factor 
 */
function preDelayFactor(factor)
{
	RxPause();
	local.send(OSCPreDelayFactor, factor);
}

/**
 * Set EnSpace reverb rear level
 * @param {float} level 
 */
function rearLevel(level)
{
	RxPause();
	local.send(OSCRearLevel, level);
}

/**
 * Set global output level with overwriting all DS100 outputs levels by joker
 * !!! Use with care as it overwrite all matrix outputs levels !!!
 * @param {float} gain (from -120 to +24 in dB)
 */
function masterOutputLevel(gain)
{
	local.send(OSCOutputGain + "*", gain);
}

/*	===============================================================================
	Commands for scene manipulation
*/

/**
 * Recall previous scene
 */
function nextScene() 
{
	RxPause();
	local.send(OSCSceneNext);
}

/**
 * Recall next scene
 */
function previousScene() 
{
	RxPause();
	local.send(OSCScenePrevious);
}

/**
 * Recal a specific scene. 
 * Scene index is split in two integers: majIndex.minIndex, max is 999.99
 * @param {integer} majIndex 
 * @param {integer} minIndex 
 */
function sceneRecall(majIndex, minIndex)
{
	RxPause();
	local.send(OSCSceneRecall, majIndex , minIndex );
}

/* 	===============================================================================
	Commands for sound objects manipulation
*/

/**
 * Set the spread parameter of a specific sound object by its matrix input number
 * @param {integer} object 
 * @param {float} spread 
 */
function sourceSpread(object, spread)
{
	RxPause();
	local.send(OSCSpread + object, spread);
}

/**
 * Set the delay mode of a specific sound object by its matrix input number
 * @param {integer} object 
 * @param {integer} mode 
 */
function sourceDelayMode(object, mode)
{
	RxPause();
	local.send(OSCDelayMode + object, mode);
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point2D array} position 
 */
function coordinateMappingSourcePositionXY(coordinateMapping, object, position) 
{
	RxPause();
	if (coordinateMapping==0) {
		coordinateMapping=local.parameters.defaultCoordinateMapping.get();
		}
	local.send(OSCPosition + coordinateMapping + "/" + object, position[0] , position[1] );
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, with Chataigne Point2D axis (center @(0.5,0.5), limits (-1,-1)-(1,1))
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point2D array} position 
 */
function coordinateMappingSourcePosition2DCartesian(coordinateMapping, object, position) 
{
	var pos=[];
	pos[0]=(1+position[0])/2;
	pos[1]=(1-position[1])/2;
	coordinateMappingSourcePositionXY(coordinateMapping, object, pos);
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, in polar coordinates (azimuth,distance), with center @(0.5,0.5)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {float} azimuth 
 * @param {float} distance 
 */
function coordinateMappingSourcePosition2DPolar(coordinateMapping, object, azimuth, distance) 
{
	var pos=[];
	pos[0]=0.5 + (distance /2 * Math.cos((0.25 - azimuth) * 2 * Math.PI));
	pos[1]=0.5 + (distance /2 * Math.sin((0.25 - azimuth) * 2 * Math.PI));
	coordinateMappingSourcePositionXY(coordinateMapping, object, pos);
}

/**
 * Set the EnSpace reverb level send for a specific object
 * @param {integer} object 
 * @param {float} gain (from -120 to +24 in dB)
 */
function reverbSendGain(object, gain)
{
	RxPause();
	local.send(OSCRevGain + object, gain);
}

/**
 * Set a specific sound object level with matrix input
 * @param {integer} object 
 * @param {float} gain (from -120 to +24 in dB)
 */
function matrixInputGain(object, gain)
{
	RxPause();
	local.send(OSCInputGain + object, gain);
}

/**
 * Set a specific sound object matrix input mute state
 * @param {integer} object 
 * @param {boolean} state 
 */
function matrixInputMute(object, state)
{
	RxPause();
	local.send(OSCInputMute + object, state);
}
/*	===============================================================================
	OSC rx parsers (from registered callback, others from OSCevent function)
	===============================================================================
*/

/**
 * OSC Receive the device serial number
 * @param {string} address 
 * @param {array} args 
 */
function rxSerialNumber(address, args)
{
	local.values.ds100DeviceStatus.serialNumber.set(args[0]);
}

/**
 * OSC Receive the device name
 * @param {string} address 
 * @param {array} args 
 */
function rxDeviceName(address, args)
{
	local.values.ds100DeviceStatus.deviceName.set(args[0]);
}

/**
 * OSC Receive an answer to ping
 */
function rxPong()
{
	local.values.ds100DeviceStatus.isThereAnybodyOutThere.set(true);
}

/**
 * OSC Receive an error code
 * @param {string} address 
 * @param {array} args 
 */
function rxError(address, args)
{
	local.values.ds100DeviceStatus.error.set(args[0]=="1");
}

/**
 * OSC Receive the error text
 * @param {string} address 
 * @param {array} args 
 */
function rxErrorText(address, args)
{
	local.values.ds100DeviceStatus.errorText.set(args[0]);
}

/**
 * OSC Receive scene index
 * @param {string} address 
 * @param {array} args 
 */
function rxSceneIndex(address, args)
{
	local.values.scenes.sceneIndex.set(args[0]);
}

/**
 * OSC Receive scene name
 * @param {string} address 
 * @param {array} args 
 */
function rxSceneName(address, args)
{
	local.values.scenes.sceneName.set(args[0]);
}

/**
 * OSC Receive scene comment
 * @param {string} address 
 * @param {array} args 
 */
function rxSceneComment(address, args)
{
	local.values.scenes.sceneComment.set(args[0]);
}

/**
 * OSC Receive EnSpace room ID
 * @param {string} address 
 * @param {array} args 
 */
function rxRoomID(address, args)
{
	if(OSCRx)
	{
		local.values.enSpace.roomID.set(args[0]);
		if(args[0]==0) local.values.enSpace.roomDescription.set("off");
		else if (args[0]==1) local.values.enSpace.roomDescription.set("Modern - small");
		else if (args[0]==2) local.values.enSpace.roomDescription.set("Classic - small");
		else if (args[0]==3) local.values.enSpace.roomDescription.set("Modern - medium");
		else if (args[0]==4) local.values.enSpace.roomDescription.set("Classic - medium");
		else if (args[0]==5) local.values.enSpace.roomDescription.set("Modern - large");
		else if (args[0]==6) local.values.enSpace.roomDescription.set("Classic - large");
		else if (args[0]==7) local.values.enSpace.roomDescription.set("Modern - medium 2");
		else if (args[0]==8) local.values.enSpace.roomDescription.set("Theater - small");
		else if (args[0]==9) local.values.enSpace.roomDescription.set("Cathedral");
	}
}

/**
 * OSC Receive EnSpace predealy factor
 * @param {string} address 
 * @param {array} args 
 */
function rxPreDelayFactor(address, args)
{
	if(OSCRx) local.values.enSpace.predelayFactor.set(args[0]);
}

/**
 * OSC Receive EnSpace rear level
 * @param {string} address 
 * @param {array} args 
 */
function rxRearLevel(addresse, args)
{
	if(OSCRx) local.values.enSpace.rearLevel.set(args[0]);
}
/*	===============================================================================
	Little helper functions
	===============================================================================
*/

/**
 * Set up some GUI fields as read only
 */
function setReadonly() {
	local.parameters.oscInput.localPort.setAttribute("readonly", true);
	local.parameters.oscOutputs.oscOutput.remotePort.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.deviceName.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.serialNumber.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.error.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.errorText.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.isThereAnybodyOutThere.setAttribute("readonly", true);
	local.values.scenes.sceneIndex.setAttribute("readonly", true);
	local.values.scenes.sceneName.setAttribute("readonly", true);
	local.values.scenes.sceneComment.setAttribute("readonly", true);
	local.values.enSpace.roomDescription.setAttribute("readonly", true);
}
/**
 * Collapse not so useful GUI containers
 */
function collapseContainers() {
	local.parameters.oscInput.setCollapsed(true);
	local.parameters.oscOutputs.setCollapsed(true);
	//local.values.setCollapsed(true);
	local.scripts.setCollapsed(true);
	local.templates.setCollapsed(true);
	local.commandTester.setCollapsed(true);
}
/**
 * Pause Rx coms while sending OSC
 */
function RxPause() {
	OSCRx=false;
	pauseRx=0;
}

function soloSO(ID,state) {
	if (state)
	{
		/* first prototype without mute states memory
		* !!! without this code finished, all matrix mute state will be lost and overwritten !!!
		//First, collect all mute states in inputMuteStates array
		for (var i = 1; i <= 64; i++) 
		{
			local.send(OSCInputMute + i);
		}

		//Should wait until all incoming message are processed ?
		*/
		//Next, mute all inputs
		RxPause;
		local.send(OSCInputMute + "*", 1);
		//And unmute the actual sounObject input
		local.send(OSCInputMute + ID, 0);
	}
	else
	{
		/* first prototype without mute states memory
		//Recover pre-solo mute states
		for (var i = 1; i <= 64; i++)
		{
			local.send(OSCInputMute + ID, inputMuteStates[i]);
		}
		* !!! unmute all !!!
		*/
		local.send(OSCInputMute + "*", 0);
	}
}
