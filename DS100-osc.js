/* Chataigne Module for d&b audiotechnik DS100 OSC v2.2 (c) Mathieu Delquignies, 05/2024
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
 * Table of OSC strings from https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.7-en.PDF
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
var OSCPositionXY = "/dbaudio1/coordinatemapping/source_position_xy/";
var OSCPositionXYZ = "/dbaudio1/coordinatemapping/source_position/";
var OSCPositionX = "/dbaudio1/coordinatemapping/source_position_x/";
var OSCPositionY = "/dbaudio1/coordinatemapping/source_position_y/";
var OSCPositionZ = "/dbaudio1/coordinatemapping/source_position_z/";
var OSCRevGain = "/dbaudio1/matrixinput/reverbsendgain/";
var OSCInputGain = "/dbaudio1/matrixinput/gain/";
var OSCChannelName = "/dbaudio1/matrixinput/channelname/";
var OSCSceneIndex = "/dbaudio1/scene/sceneindex";
var OSCSceneName = "/dbaudio1/scene/scenename";
var OSCSceneComment = "/dbaudio1/scene/scenecomment";
var OSCInputMute = "/dbaudio1/matrixinput/mute/";
var OSCFGOutputGain = "/dbaudio1/soundobjectrouting/gain/";
var OSCFGOutputMute = "/dbaudio1/soundobjectrouting/mute/";
var OSCSRStatus = "/dbaudio1/status/audionetworksamplestatus";
var OSCMeter ="/dbaudio1/matrixinput/levelmeterpremute/";

/** 
 * Global variables
 */
var parametricSOContainer =null;
var updateRate =null;
var defaultCoordinateMapping =null;
//var coordinateMappingFilter =null;
var getSOPositionsXYZ =null;
var getParametricSO = null;
var getScenes = null;
var getEnSpace = null;
var xyz = [];
var xy = [];
var z = [];

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
function init() 
{
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
	local.register(OSCSRStatus, "rxSRStatus");

	// Add Parametric Sound Object container of values
	parametricSOContainer = local.values.addContainer("Parametric Sound Object", "Parameters of one Sound Object specified by Index");
	parametricSOContainer.addIntParameter("Index", "object ID, DS100 Matrix inputs, from 1 to 64", 1, 1, 64);
	// this value is an GUI editable parameter
	var channelName = parametricSOContainer.addStringParameter("Channel Name", "Matrix input name", "Object name");
	channelName.setAttribute("readonly", true);
	var coordinateMapping = parametricSOContainer.addIntParameter("Coordinate Mapping", "DS100 coordinate mapping filter for Rx positions", 0, 0, 4);
	var position2D = parametricSOContainer.addPoint2DParameter("Position 2D", "(x,y) position in coordinate mapping");
	position2D.setAttribute("readonly", true);
	var positionZ = parametricSOContainer.addFloatParameter("Position Z", "(z) vertical position in coordinate mapping", 0, 0, 1);
	positionZ.setAttribute("readonly", true);
	var spread = parametricSOContainer.addFloatParameter("Spread", "object spread", 0, 0, 1);
	spread.setAttribute("readonly", true);
	var reverb = parametricSOContainer.addFloatParameter("Reverb", "EnSpace send level", 0, -120, 24);
	reverb.setAttribute("readonly", true);
	var meter = parametricSOContainer.addFloatParameter("Meter", "Level meter pre mute", 0, -120, 0);
	reverb.setAttribute("readonly", true);
	// option to see this as integer:
	var mode = parametricSOContainer.addIntParameter("Mode", "Delay mode", 0, 0, 2); 
	// option to see this as enum: (issue : less straight forward to use this string value to change and send it to DS100 instead of integer)
	//var mode = parametricSOContainer.addEnumParameter("Delay Mode", "Delay mode", "0: Off", 0, "1: Tight", 1, "2: Full", 2);
	mode.setAttribute("readonly", true);
	var level = parametricSOContainer.addFloatParameter("Level", "Matrix input level", 0, -120, 24);
	level.setAttribute("readonly", true);
	var mute = parametricSOContainer.addBoolParameter("Mute", "Matrix input mute", false);
	mute.setAttribute("readonly", true);
	parametricSOContainer.setCollapsed(true);

	// Add Sound Objects Positions XYZ, XY and Z container of values
	SOPositionsContainer = local.values.addContainer("All Sound Objects Positions", "X, Y and Z values for each of the 64 objects");
	SOXYZContainer = SOPositionsContainer.addContainer("XYZ", "X, Y and Z values for each of the 64 objects");
	SOXYContainer = SOPositionsContainer.addContainer("XY", "X and Y values for each of the 64 objects");
	SOZContainer = SOPositionsContainer.addContainer("Z", "Z values for each of the 64 objects");

	// Add XYZ values into those containers
	for (var i = 1; i < 65; i++) {
    	xyz[i]= SOXYZContainer.addPoint3DParameter(i, "XYZ");
		xyz[i].setAttribute("readonly", true);
		xy[i]= SOXYContainer.addPoint2DParameter(i, "XY");
		xy[i].setAttribute("readonly", true);
		z[i]= SOZContainer.addFloatParameter(i, "Z", 0);
		z[i].setAttribute("readonly", true);
    	};
	// collapsed as default
    SOPositionsContainer.setCollapsed(true);

	// Setup default reception update rate as in module GUI
	updateRate = local.parameters.updateRate.get();
	script.setUpdateRate(updateRate);
	getParametricSO=local.parameters.getParametricSO.get();
	getSOPositionsXYZ=local.parameters.getSOPositionsXYZ.get();
	getScenes=local.parameters.getScenes.get();
	getEnSpace=local.parameters.getEnSpace.get();
	defaultCoordinateMapping = local.parameters.defaultCoordinateMapping.get();
	coordinateMappingFilter = defaultCoordinateMapping; // SO Positions store only objects received with this Coordinate Mapping. From now, same as Default
	
	// GUI setup
	setReadonly();
	collapseContainers();
}

/**
 * This function is called at updateRate period. 
 * Send commands to get module values automatically
 * @param {integer} updateRate 
 */
function update(updateRate)
{
	if(getParametricSO) updateSoundObject(parametricSOContainer.index.get());
	if(getSOPositionsXYZ) updateSOPositions(local.parameters.getSOPositionsRange.get());
	if(getScenes) updateScenes();
	if(getEnSpace) updateEnSpace();
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
	if(param.is(local.parameters.getParametricSO)) 
	{
		getParametricSO = local.parameters.getParametricSO.get(); 
		local.values.parametricSoundObject.setCollapsed(!getParametricSO);
	}
	if(param.is(local.parameters.getSOPositionsXYZ))
	{
		getSOPositionsXYZ = local.parameters.getSOPositionsXYZ.get(); 
		local.values.soundObjectsPositions.setCollapsed(!getSOPositionsXYZ);
	}
	if(param.is(local.parameters.getScenes))
	{
		getScenes = local.parameters.getScenes.get();
		local.values.scenes.setCollapsed(!getScenes);
	}
	if(param.is(local.parameters.getEnSpace))
	{
		getEnSpace = local.parameters.getEnSpace.get();
		local.values.enSpace.setCollapsed(!getEnSpace);
	}
	if(param.is(local.parameters.defaultCoordinateMapping))
	{
		defaultCoordinateMapping=local.parameters.defaultCoordinateMapping.get();
	}
	// Will add there in the future a parameter for number of sound objects containers, start in this version to try out only one "0" sound object
}

/**
 * This function is called automatically by Chataigne when a module value changes
 * @param {value} value 
 */
function moduleValueChanged(value)
{
	var id = local.values.parametricSoundObject.index.get();
	if(value.isParameter())
	{
		// Value parser
		if (value.name=="index")
		{
			// input channel ID has changed, so we need to update all the soundObject container values
			state=getSoundObjects;
			getSoundObjects=true;
			updateSoundObject(id);
			getSoundObjects=state;

			local.send(OSCChannelName + id); // Retreive channel name string. 
			// (From now, to speed up updateSoundObject and lower coms, this is done just once here, not in autoUpdate)
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
			local.send(OSCSRStatus);
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
	var soundObjectID = parametricSOContainer.index.get();
	var coordinateMappingFilter = parametricSOContainer.coordinateMapping.get();
	if (coordinateMappingFilter==0) 
	{
		coordinateMappingFilter=defaultCoordinateMapping;
	}
		if (local.match(address, OSCPositionXY+coordinateMappingFilter+"/"+soundObjectID)) // This is the Parametric Sound Object position XY values
		{
			parametricSOContainer.position2D.set(args[0], args[1]);
		}
		else if (local.match(address, OSCPositionZ+coordinateMappingFilter+"/"+soundObjectID+"/")) // This is Parametric SO position Z
		{
			parametricSOContainer.positionZ.set(args[0]);
		}
		else if (local.match(address, OSCPositionXYZ+coordinateMappingFilter+"/*/")) // This is another Sound Object position XYZ values (same mapping as Parametric SO)
		{
			id=parseInt(address.substring(OSCPositionXYZ.length+2, address.length));
			xyz[id].set(args[0], args[1], args[2]);
			xy[id].set(args[0], args[1]);
			z[id].set(args[2]);
		}
		else if (local.match(address, OSCInputGain+soundObjectID)) // this is a sound object (matrix input) level
		{
			parametricSOContainer.level.set(args[0]);
		}
		else if (local.match(address, OSCSpread+soundObjectID)) // this is a sound object spread value
		{
			parametricSOContainer.spread.set(args[0]);
		}
		else if (local.match(address, OSCRevGain+soundObjectID)) // this is a sound object reverb send gain value
		{
			parametricSOContainer.reverb.set(args[0]);
		}
		else if (local.match(address, OSCDelayMode+soundObjectID)) // this is a sound object delay mode value (Enum type, key is the "delay mode" descriptor string)
		{
			script.log("mode: "+args[0]);
			parametricSOContainer.mode.set(args[0]);
		}
		else if (local.match(address, OSCChannelName+soundObjectID)) // this is the channel name string
		{
			parametricSOContainer.channelName.set(args[0]);
		}
		else if (local.match(address, OSCInputMute+soundObjectID)) // this is the channel mute state
		{
			parametricSOContainer.mute.set(args[0]);	
		}
		else if (local.match(address, OSCMeter+soundObjectID)) // this is the channel level metering (pre mute)
		{
			parametricSOContainer.meter.set(args[0]);
		}
		else 
		{
		script.logWarning("OSC Event parser received useless OSC messages: " + address + " " + args);
		}
}

/* 	===============================================================================
	Update functions, received by module values container

	Send OSC commands, so DS100 will answers with the corresponding parameters
	Rx will be parsed by oscEvent()
	===============================================================================
*/

/**
 * Send OSC commands to retreive Parametric Sound Object container values
 * @param {id} Integer Sound Object Index (1-64)
 */
function updateSoundObject(id)
{
	var coordinateMapping = parametricSOContainer.coordinateMapping.get();
	if (coordinateMapping==0) {
		coordinateMapping=defaultCoordinateMapping;
	}
	{
		local.send(OSCPositionXY + coordinateMapping + "/" + id );
		local.send(OSCPositionZ + coordinateMapping + "/" + id );
		local.send(OSCSpread + id);
		local.send(OSCInputGain + id);
		local.send(OSCRevGain + id);
		local.send(OSCDelayMode + id);
		local.send(OSCInputMute + id);
		local.send(OSCMeter + id);
	}
}

/**
 * Send OSC commands to retreive Parametric Sound Object container values
 * @param {range} String Range of SO, can be joker like * for all, or [11,17] or suite {1,2,7,8}
 */
function updateSOPositions(range)
{
	local.send(OSCPositionXYZ + defaultCoordinateMapping + "/" + range);
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
	local.send(OSCRoomId, id);
}

/**
 * Set EnSpace reverb predelay factor
 * @param {float} factor 
 */
function preDelayFactor(factor)
{
	local.send(OSCPreDelayFactor, factor);
}

/**
 * Set EnSpace reverb rear level
 * @param {float} level 
 */
function rearLevel(level)
{
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
	local.send(OSCSceneNext);
}

/**
 * Recall next scene
 */
function previousScene() 
{
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
	local.send(OSCSpread + object, spread);
}

/**
 * Set the delay mode of a specific sound object by its matrix input number
 * @param {integer} object 
 * @param {integer} mode 
 */
function sourceDelayMode(object, mode)
{
	local.send(OSCDelayMode + object, mode);
}

/**
 * Set a specific sound object X position in a specified coordinate Mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {float} X 
 */
function coordinateMappingSourcePositionX(coordinateMapping, object, X) 
{
	if (coordinateMapping==0) {
		coordinateMapping=defaultCoordinateMapping;
		}
	local.send(OSCPositionX + coordinateMapping + "/" + object, X);
}

/**
 * Set a specific sound object Y position in a specified coordinate Mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point2D array} Y 
 */
function coordinateMappingSourcePositionY(coordinateMapping, object, Y) 
{
	if (coordinateMapping==0) {
		coordinateMapping=defaultCoordinateMapping;
		}
	local.send(OSCPositionY + coordinateMapping + "/" + object, Y );
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point2D array} position 
 */
function coordinateMappingSourcePositionXY(coordinateMapping, object, position) 
{
	if (coordinateMapping==0) {
		coordinateMapping=defaultCoordinateMapping;
		}
	local.send(OSCPositionXY + coordinateMapping + "/" + object, position[0] , position[1] );
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, with DS100 cartesian XYZ standard limits (0,0)-(1,1)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point3D array} position 
 */
function coordinateMappingSourcePoint3D(coordinateMapping, object, position) 
{
	if (coordinateMapping==0) {
		coordinateMapping=defaultCoordinateMapping;
		}
	local.send(OSCPositionXYZ + coordinateMapping + "/" + object, position[0] , position[1], position[2]);
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, with Chataigne Point2D axis (center @(0.5,0.5), limits (-1,-1)-(1,1))
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {point2D array} position 
 */
function coordinateMappingSourcePoint2D(coordinateMapping, object, position) 
{
	var pos=[];
	pos[0]=(1+position[0])/2;
	pos[1]=(1+position[1])/2;
	coordinateMappingSourcePositionXY(coordinateMapping, object, pos);
}

/**
 * Set a specific sound object position in a specified coordinate Mapping, in polar coordinates (azimuth,distance), with center @(0.5,0.5)
 * @param {integer} coordinateMapping 
 * @param {integer} object 
 * @param {float} azimuth 
 * @param {float} distance 
 */
function coordinateMappingSourcePositionPolar(coordinateMapping, object, azimuth, distance) 
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
	local.send(OSCRevGain + object, gain);
}

/**
 * Set a specific sound object level with matrix input
 * @param {integer} object 
 * @param {float} gain (from -120 to +24 in dB)
 */
function matrixInputGain(object, gain)
{
	local.send(OSCInputGain + object, gain);
}

/**
 * Set a specific sound object matrix input mute state
 * @param {integer} object 
 * @param {boolean} state 
 */
function matrixInputMute(object, state)
{
	local.send(OSCInputMute + object, state);
}


/**
 * Set a specific sound object level within a specific FG
 * @param {integer} object 
 * @param {integer} FG (Function Group, from 1 to 16)
 * @param {float} gain (from -120 to +24 in dB)
 */
 function FGOutputGain(object, FG, gain)
 {
	 local.send(OSCFGOutputGain + FG + "/" + object, gain);
 }
 
 /**
  * Set a specific sound object matrix input mute state
  * @param {integer} object
  *  * @param {integer} FG (Function Group, from 1 to 16)
  * @param {boolean} state 
  */
 function FGOutputMute(object, FG, state)
 {
	 local.send(OSCFGOutputMute + FG + "/" + object, state);
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
	local.values.enSpace.roomID.set(args[0]);
	if(args[0]==0) local.values.enSpace.roomDescription.set("EnSpace off");
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

/**
 * OSC Receive EnSpace predealy factor
 * @param {string} address 
 * @param {array} args 
 */
function rxPreDelayFactor(address, args)
{
	local.values.enSpace.predelayFactor.set(args[0]);
}

/**
 * OSC Receive EnSpace rear level
 * @param {string} address 
 * @param {array} args 
 */
function rxRearLevel(addresse, args)
{
	local.values.enSpace.rearLevel.set(args[0]);
}

/**
 * OSC Receive Sample Rate Status
 * @param {string} address 
 * @param {array} args 
 */
function rxSRStatus(addresse, args)
{
	var status="Unsupported ("+args[0]+")";
	if (args[0]==4)
	{
		status="48 kHz";
	};
	if (args[0]==6)
	{
		status="96 kHz";
	};
	local.values.ds100DeviceStatus.samplingRate.set(status); //root.modules.dbDS100.values.ds100DeviceStatus.samplingRate
}
/*	===============================================================================
	Little helper functions
	===============================================================================
*/

/**
 * Set up some GUI fields as read only
 */
function setReadonly() 
{
	//local.parameters.oscInput.localPort.setAttribute("readonly", true);
	//local.parameters.oscOutputs.oscOutput.remotePort.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.deviceName.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.serialNumber.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.error.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.errorText.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.samplingRate.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.isThereAnybodyOutThere.setAttribute("readonly", true);
	local.values.scenes.sceneIndex.setAttribute("readonly", true);
	local.values.scenes.sceneName.setAttribute("readonly", true);
	local.values.scenes.sceneComment.setAttribute("readonly", true);
	local.values.enSpace.roomID.setAttribute("readonly", true);
	local.values.enSpace.roomDescription.setAttribute("readonly", true);
	local.values.enSpace.predelayFactor.setAttribute("readonly", true);
	local.values.enSpace.rearLevel.setAttribute("readonly", true);
}
/**
 * Collapse not so useful GUI containers
 */
function collapseContainers() 
{
	local.parameters.oscInput.setCollapsed(true);
	//local.parameters.oscOutputs.setCollapsed(true);
	//local.values.setCollapsed(true);
	local.values.scenes.setCollapsed(true);
	local.values.enSpace.setCollapsed(true);
	local.scripts.setCollapsed(true);
	local.templates.setCollapsed(true);
	local.commandTester.setCollapsed(true);
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
