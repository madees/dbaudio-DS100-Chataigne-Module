// DS100 OSC v1.0 commands implementation by MD d&b audiotechnik 07/2020

/* 
// Pour v2
var valuesContainer = local.values;
var soundObjectContainer;
var soundObject = [];
*/

function init() {
	// GUI
	setReadonly();
	collapseContainers();

	// Register OSC received message to callback functions
	local.register("/dbaudio1/settings/devicename", "rxDeviceName");
	local.register("/dbaudio1/fixed/sernr", "rxSerialNumber");
	local.register("/pong", "rxPong");
	local.register("/dbaudio1/error/gnrlerr", "rxError");
	local.register("/dbaudio1/error/errortext", "rxErrorText");
}

function moduleParameterChanged(param)
{
	if(param.is(root.modules.dbDS100OSCControl.parameters.enSpaceReverbRoom))
	{
		reverbRoomId(param.get());
	}
}

function moduleValueChanged(value)
{
	if(value.isParameter())
	{
		// From now, all set to read only
	} else 
	{
		if (value.name=="clickToUpdateAll")
		{
			local.send("/dbaudio1/settings/devicename");
			local.send("/dbaudio1/fixed/sernr");
			local.values.ds100DeviceStatus.isThereAnybodyOutThere.set(false);
			local.send("/ping");
			local.send("/dbaudio1/error/gnrlerr");
			local.send("/dbaudio1/error/errortext");
		}
	}
}

/* 
//////////////////
// Dynamic values sound object manager
//////////////////
// Pour v2
// Prototypes de fonctions pour gestion dynamique (nombre d'objets) et bidirectionnelle des soundObjets à partir d'un Manager.

function clearsoundObject() {
	soundObject = [];
	valuesContainer.removeContainer("soundObject");
	soundObjectContainer = valuesContainer.addContainer("soundObject", "List of soundObject");
}

function createsoundObjectContainer(soundObject) {
	var index = soundObject.length - 1; //???
	var container = soundObjectContainer.addContainer("Sound Object" + index );
	//container.setCollapsed(true);

	soundObject.container = container;

	var id = container.addIntParameter("Input", "object ID", 1, 1, 64);
	soundObject.idParameter = id;
		
	//var x = container.addFloatParameter("X", "object X position", 0, 0, 1);
	//soundObject.xParameter = x;
	
	//var y = imuC.addFloatParameter("Y", "object Y position", 0, 0, 1);
	//soundObject.yParameter = y;

	var position2D = container.addPoint2DParameter("Position", "(x,y) position in coordinate mapping");
	soundObject.position2DParameter = position2D;
	
	var spread = container.addFloatParameter("Spread", "onject spread", 0, 0, 1);
	soundObject.spreadParameter = spread;

	var reverb = container.addFloatParameter("Reverb", "EnSpace send level", 0, 0, 1);
	soundObject.reverbParameter = reverb;

	var mode = container.addEnumParameter("Mode", "Delay mode", "off", 0, "tight", 1, "full", 2);
	soundObject.modeParameter = mode;
}
*/


//////////////////
// Commands
//////////////////

//////////////////
// DS100 global commands

// clear all DS100 settings
function deviceClear()
{
	//if (root.confirm("It will clear all devices settings, are you sure ?")==True)
	{
		local.send("/dbaudio1/device/clear");
	}
}

// set the reverb room id (0=off, 1-9=room model)
function reverbRoomId(id)
{
	local.send("/dbaudio1/matrixsettings/reverbroomid", id);
}

// set global output level with overwriting all DS100 outputs levels by joker !!! Use with care
function masterOutputLevel(gain)
{
	local.send("/dbaudio1/matrixoutput/gain/*", gain);
}

//////////////////
// Scene manipulation

// switch to next scene
function nextScene() 
{
	local.send("/dbaudio1/scene/next");
}

// switch to previous scene
function previousScene() 
{
	local.send("/dbaudio1/scene/previous");
}

// recal a specific scene. Scene index is split in two integers: majIndex.minIndex, max is 999.99
function sceneRecall(majIndex, minIndex)
{
	local.send("/dbaudio1/scene/recall/", majIndex , minIndex );
}

//////////////////
// Sound objects manipulation

// set the spread parameter of a specific sound object
function sourceSpread(object, spread)
{
	local.send("/dbaudio1/positioning/source_spread/"+ object, spread);
}

// set the delay mode of a specific sound object
function sourceDelayMode(object, mode)
{
	local.send("/dbaudio1/positioning/source_delaymode/"+ object, mode);
}

// set a specific sound object position in a specified coordinate mapping, with DS100 cartsian XY standard limits (0,0)-(1,1)
function coordinateMappingSourcePositionXY(mapping, object, position) 
{
	if (mapping==0) {
		mapping=root.modules.dbDS100OSCControl.parameters.defaultCoordinateMapping.get();
		//root.modules.dbDS100OSCControl.commandTester.command.mapping.set(mapping); // modification du paramtre individuel : pas l'air de marcher !!!
	}
	local.send("/dbaudio1/coordinatemapping/source_position_xy/" + mapping + "/" + object, position[0] , position[1] );
}

// set a specific sound object position in a specified coordinate mapping, with Chataigne Point2D axis (center @(0.5,0.5), limits (-1,-1)-(1,1))
function coordinateMappingSourcePosition2DCartesian(mapping, object, position) 
{
	var pos=[];
	pos[0]=(1+position[0])/2;
	pos[1]=(1-position[1])/2;
	coordinateMappingSourcePositionXY(mapping, object, pos);
}

// set a specific sound object position in a specified coordinate mapping, in polar coordinates (azimuth,distance), with center @(0.5,0.5)
function coordinateMappingSourcePosition2DPolar(mapping, object, azimuth, distance) 
{
	var pos=[];
	pos[0]=0.5 + (distance /2 * Math.cos((0.25 - azimuth) * 2 * Math.PI));
	pos[1]=0.5 + (distance /2 * Math.sin((0.25 - azimuth) * 2 * Math.PI));
	coordinateMappingSourcePositionXY(mapping, object, pos);
}

// set the EnSpace reverb level send for a specific object
function reverbSendGain(object, gain)
{
	local.send("/dbaudio1/matrixinput/reverbsendgain/" + object, gain);
}

// set a specific sound object level with matrix input
function matrixInputGain(object, gain)
{
	local.send("/dbaudio1/matrixinput/gain/" + object, gain);
}

///////////////////////
// OSC rx parsers (from registered callback)
///////////////////////
function rxSerialNumber(address, args)
{
	local.values.ds100DeviceStatus.serialNumber.set(args[0]);
}

function rxDeviceName(address, args)
{
	local.values.ds100DeviceStatus.deviceName.set(args[0]);
}

function rxPong()
{
	local.values.ds100DeviceStatus.isThereAnybodyOutThere.set(true);
}

function rxError(address, args)
{
	local.values.ds100DeviceStatus.error.set(args[0]=="1");
}

function rxErrorText(address, args)
{
	local.values.ds100DeviceStatus.errorText.set(args[0]);
}

///////////////////////
// Helper
///////////////////////

function setReadonly() {
	local.parameters.oscInput.localPort.setAttribute("readonly", true);
	local.parameters.oscOutputs.oscOutput.remotePort.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.deviceName.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.serialNumber.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.error.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.errorText.setAttribute("readonly", true);
	local.values.ds100DeviceStatus.isThereAnybodyOutThere.setAttribute("readonly", true);
}

function collapseContainers() {
	local.parameters.oscInput.setCollapsed(true);
	local.parameters.oscOutputs.setCollapsed(true);
	local.values.setCollapsed(true);
	local.scripts.setCollapsed(true);
}

