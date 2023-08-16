# dbaudio-DS100-Chataigne-Module
Chataigne module to control d&amp;b audiotechnik DS100 matrix hardware with OSC protocol.  

To learn more about Chataigne, please visit : http://benjamin.kuperberg.fr/chataigne/

And Ben's Youtube channel where you can find tutorials : https://youtu.be/RSBU9MwJNLY

To learn more about d&amp;b audiotechnik DS100, please visit : https://www.dbsoundscape.com/  

For global support on how to use Chataigne and its modules, please visit the forum : 
http://benjamin.kuperberg.fr/chataigne/forum 
or join us on Discord : 
https://discord.com/invite/ngnJ5z my contact there is also "madees".

## Installation
To install the Custom Module, it's very easy inside Chataigne :
Go to File menu>Community Module Manager
You'll find the module in the Module Manager>Hardware>Community Modules.

## Principle of use
You may use Module Commands to change DS100 parameters, and Module Values to retrieve its parameters.
Values are read only, and from now you can see only one Sound Object at a time in SoundObjects container, but you can change the SoundObject ID you want to retreive as a parameter. When you change this ID, it will retreive automatically all the container values of the corresponding SoundObject once, even if you don't use "Get SoundObjects" auto update function.

## Module interface
First, global Module parameters :
#### - Update rate
OSC reception pooling rate, in Hz. Default recommended value is 20Hz, minimum is 0.2 Hz (5 seconds), maximum is 50 Hz (20 ms). If you don't need to retrieve values container below, you can de-activate the "get" commands, for example if Chataigne is the only controling device or just send commands. If your application is not time critical in terms of real time feedback of DS100 object parameters, you can lower the rate and save ressources and network bandwitdth.

#### - Get SoundObjects, Get Scenes, Get EnSpace
Send commands to DS100 to retrieve corresponding values container datas from device, at update rate specified above. If you don't need continuous feedback from device, you can deactivate those functions, it will reduce OSC/DS100 load and network traffic bandwidth.
Default values are "false" (off) so the module is "OSC output quiet" when no Commands are sent by your Noisette, those containers values will update only when you use corresponding Commands, and so the device answers back to confirm reception and parameters changes.

#### - Default Coordinate Mapping
Used in all commands that need to specify a coordinate mapping.
If you set it at 0 in SoundObject positionning Commands, it will use this default value instead.

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

#### - Values>SoundObjects>SoundObject0
This container receives one soundObject parameters. Read only except SoundObject ID.
Its ID correspond to the "matrix input" number, so you can choose which object you want to retreive parameters.
If "Get SoundObjects" module parameter is on, the values will be retrieved continuously at Update Rate. If not, you'll have update only when the device sent them to you, generally by answering back when you change this SoundObject parameters with a command.

## Commands
Commands are ready to use in your scripts, with the "Command tester" tool, or as outputs from the State machine and Sequences in Time Machine. As an example, you can create a Sequence, add a Mapping 2D and use as outputs the command coordinateMappingPosition2DCartesian to generate sound objects displacements cues.

#### Common arguments
- gain is in dB, float, -120 to +24 range
- object is sound object (input matrix channel), integer, 1 to 64 range
- mapping is the DS100 coordinate mapping area as specified in R1, integer. 0 will use the global module parameter, 1 to 4 range.

Here is the command list, if you need to know more about arguments type and ranges, please refer to the https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.0-en.pdf

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

- coordinateMappingSourcePosition2DCartesian(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with Chataigne Point2D axis ( limits (-1,-1)-(1,1)), output to default DS100 coordinate mapping, center (0,0) from Chataigne will be @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- coordinateMappingSourcePosition2DPolar(mapping, object, azimuth, distance) : set a specific sound object position in a specified coordinate mapping, in polar coordinates (azimuth,distance), azimuth & distance are floats, range 0-1, output to default DS100 coordinate mapping with center @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- reverbSendGain(object, gain) : set the EnSpace reverb level send for a specific object

- matrixInputGain(object, gain) : set a specific sound object level

- matrixInputMute(object, boolean) : set a specific sound object mute state