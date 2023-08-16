# dbaudio-DS100-Chataigne-Module
Chataigne module to control d&amp;b audiotechnik DS100 matrix hardware with OSC protocol.  

This community module is NOT OFFICIALLY supported by d&b audiotechnik.
It is publicly available to enable interested users to experiment, extend and create their own adaptations.
There is no guarantee for compatibility in between versions or for the implemented functionality to be reliable for professional.
Use what is provided here at your own risk!

To learn more about Chataigne, please visit : http://benjamin.kuperberg.fr/chataigne/

And Ben's Youtube channel where you can find tutorials : https://youtu.be/RSBU9MwJNLY

To learn more about d&amp;b audiotechnik DS100, please visit : https://www.dbsoundscape.com/  

For global support on how to use Chataigne and its modules, please join us on Discord : 
https://discord.com/invite/ngnJ5z my contact there is also "madees".

## Installation
To install the Custom Module, it's very easy inside Chataigne :
Go to File menu>Community Module Manager
You'll find the module in the Module Manager>Hardware>Community Modules.

## Principle of use
You may use Module Commands to change DS100 parameters, and Module Values to retrieve its parameters.
Values are read only.

Sound Object is abbreviated to "SO".

## Module interface
First, global Module parameters :
#### - Update rate
Values polling rate, in Hz. Default recommended value is 20Hz (50 ms), minimum is 0.2 Hz (5 seconds), maximum is 50 Hz (20 ms). 

As automatic polling of parameters is a big network bandwith consumer, if you don't need to retrieve any values changed by third (applications where you use Chataigne to control the device and send commands only), you should de-activate all the "get" commands as default.
If your application is not time critical in terms of real time feedback of DS100 object parameters, you can also lower the rate and save ressources and network bandwitdth.

#### - Get parametric SO, SO Positions XYZ, Get Scenes, Get EnSpace
Automatically send commands to DS100 to retrieve corresponding values container datas from device, at update rate specified above. 

If you don't need continuous feedback from device, you can deactivate those functions, it will reduce OSC/DS100 load and network traffic bandwidth.
Default values are "false" (off) so the module is "OSC output quiet" when no Commands are sent by your Noisette, those containers values will update only when you use corresponding Commands, and so the device answers back to confirm reception and parameters changes.

#### - Get SO Positions range
String to choose which objects are polled. It uses standard OSC wildcards, so "*" means all channel available (64), you can specify only one number, or a range, example [12-24] will do for object 12 to 24. See dbaudio-osc-protocol-ds100-1.3.7-en.pdf page 5 for more examples.

#### - Default Coordinate Mapping
Used in all commands that need to specify a coordinate mapping.
If you set mapping parameter to 0 in commands, it will use this default value.

#### - OSC Input port
Preset to DS100 talking port (50011) and local IP.

#### - OSC Output port
Preset to DS100 listening port (50010).
Default IP address setting is 192.168.1.100. You can change it there if necessary. If DHCP or Zeroconf is used, you can automatically discover devices on network with the "Auto detect" button.

#### - Values>DS100 Device status
This container gives some usefull informations about the device. As they are configuration settings, those values are not updated automatically.
So the only action there is a trigger "Click to update all", that will collect those Device infos.
All others values are read only.
"Is there anybody out there" indicator is turning blue when the Device answers to Ping Command.

#### - Values>Scenes
This container shows actual scene index, name and comment. Read only.
Use Commands to change scene (index, previous, next).
If "Get Scenes" module parameter is on, the values will be retrieved  from device continuously at Update Rate. If not, you'll have update only when the device sent them to you, generally by answering back when you change the scene with a Command.

#### - Values>EnSpace
This container shows actual EnSpace reverberation settings. Read only.
If "Get EnSpace" module parameter is on, the values will be retrieved from device continuously at Update Rate. If not, you'll have update only when the device sent them to you, generally by answering back when you change those parameters with corresponding Commands.

#### - Values>Parametric Sound Object
This container receives one Sound Object (SO) parameters. Read only except Index.
Its Index correspond to the "DS100 matrix input" number, so you can choose which object you want to retreive parameters.
If "Get SoundObjects" module parameter is on, the values will be retrieved continuously at Update Rate. If not, you'll have update only when the device sent them to you, generally by answering back when you change this SoundObject parameters with a command.

#### - Values>Sound Objects Positions
This container receives all (64) Sound Objects positions (X,Y,Z) triplets in Default Coordinate Mapping from "Get SO Positions XYZ" option.

## Commands
Commands are ready to use with the "Command tester" tool, or as outputs from the State machine and Sequences in Time Machine, or from your own scripts. As an example, you can create a Sequence, add a Mapping 2D and use as outputs the command coordinateMappingPosition2DCartesian to generate sound objects displacements cues.

#### Common arguments
- gain is in dB, float, -120 to +24 range
- object is sound object (input matrix channel), integer, 1 to 64 range
- mapping is the DS100 coordinate mapping area as specified in R1, integer. 0 will use the global module parameter, or specific area form 1 to 4.

Here is the command list, if you need to know more about arguments type and ranges, please refer to the https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.7-en.pdf

- Custom Message() :
If you need one OSC command that isn't in the module yet, (for example, matrix control), the command Custom Message is there in the module for that purpose. Just add the OSC string from documentation above and eventually Arguments. If you think this command may be usefull for other users and want to add it to the Community Module, please contact us thru Chataigne Discord or Forum : http://benjamin.kuperberg.fr/chataigne/en/#community

### Global device
- deviceClear() : clear all DS100 values settings !!! Use with care (confirmation Popup window)

- masterOutputLevel(gain) : set global output level by overwriting all DS100 outputs levels !!! Use with care

### Scenes manipulation
- nextScene() : switch to next scene

- previousScene() : switch to previous scene

- sceneRecall(majIndex, minIndex) : recal a specific scene. Scene index is split in two integers: majIndex.minIndex, max is 999.99

### EnSpace manipulation
- reverbRoomId(id) : set the reverb room id (0=off, 1-9=room model)

- preDelayFactor(float) : set the reverb pre-delay factor, from 0.2 to 2

- rearLevel(float) : set the reverb rear sources returns levels, from -24 dB to +24 dB

### Sound objects manipulation
- sourceSpread(object, spread) : set the spread parameter of a specific sound object

- sourceDelayMode(object, mode) : set the delay mode of a specific sound object

- coordinateMappingSourcePositionXY(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)

- coordinateMappingSourcePositionX(mapping, object, position) : set a specific sound object X only position in a specified coordinate mapping, range 0-1

- coordinateMappingSourcePositionY(mapping, object, position) : set a specific sound object Y only position in a specified coordinate mapping, range 0-1

- coordinateMappingSourcePoint2D(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with Chataigne Point2D axis ( limits (-1,-1)-(1,1)), output to default DS100 coordinate mapping, center (0,0) from Chataigne will be @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- coordinateMappingSourcePoint3D(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with Point3D for (X,Y,Z), area limits are (0,0,0)-(1,1,1).

- coordinateMappingSourcePositionPolar(mapping, object, azimuth, distance) : set a specific sound object position in a specified coordinate mapping, in polar coordinates (azimuth,distance), azimuth & distance are floats, range 0-1, output to default DS100 coordinate mapping with center @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- reverbSendGain(object, gain) : set the EnSpace reverb level send for a specific object

- matrixInputGain(object, gain) : set a specific sound object level

- matrixInputMute(object, boolean) : set a specific sound object mute state

- FGOutputMute(object, boolean) : set a specific sound object mute state to a specific Function Group

- FGOutputGain(Object, gain) : set the gain of this specific Sound Object to this specific Function Group cross point