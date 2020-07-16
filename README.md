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
To install the Custom Module, just copy the folder in My Documents\Chataigne\modules.
You'll find the module in the Module Manager>Hardware>Community Modules.

## Module interface
First, Module parameters :
- Default Coordinate Mapping : used in all commands that need to specify a coordinate mapping.
If you keep the command mapping parameter at 0, it will use this default value instead.

- EnSpace Reverb Room :
A selector to directly change or turn off the EnSpace room simulator from Chataigne GUI.

- OSC Output port :
Default IP address setting is 192.168.1.100. You can change it there if necessary.

- Values>DS100 Device status
The only action there is a trigger, that will collect the Device infos.
All others values are read only.
"Is there anybody out there" indicator is turning blue when the Device answers to Ping.

## Commands
From now, in V1, only commands have been implemented and tested. Next step will be to have Sound Object container(s) for direct access to bi directionnal Values manipulation.

Commands are ready to use in your scripts, or with the "Command tester" tool, or as outputs from the Sequences in Time Machine. As an example, you can create a Sequence, add a Mapping 2D and use as outputs the command coordinateMappingPosition2DCartesian to generate sound objects displacements cues.

#### Common arguments
- gain is in dB, float, -120 to +24 range
- object is sound object (input matrix channel), integer, 1 to 64 range
- mapping is the DS100 coordinate mapping system id, integer, 0 will use the global module parameter, 1 to 4 range

Here is the command list, if you need to know more about arguments type and ranges, please refer to the https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.0-en.pdf
If you need one OSC command that isn't in the module yet, (for example, matrix control), the command Custom Message is there in the module for that purpose. Just add the OSC string from documentation above and eventually Arguments. If you think this command may be usefull for other users and want to add it to the Module, just contact me.

### Global device
- deviceClear() : clear all DS100 values settings !!! Use with care

- reverbRoomId(id) : set the reverb room id (0=off, 1-9=room model)

- masterOutputLevel(gain) : set global output level with overwriting all DS100 outputs levels !!! Use with care

- nextScene() : switch to next scene

- previousScene() : switch to previous scene

- sceneRecall(majIndex, minIndex) : recal a specific scene. Scene index is split in two integers: majIndex.minIndex, max is 999.99

### Sound objects manipulation
- sourceSpread(object, spread) : set the spread parameter of a specific sound object

- sourceDelayMode(object, mode) : set the delay mode of a specific sound object

- coordinateMappingSourcePositionXY(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)

- coordinateMappingSourcePosition2DCartesian(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with Chataigne Point2D axis ( limits (-1,-1)-(1,1)), output to default DS100 coordinate mapping, center (0,0) from Chataigne will be @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- coordinateMappingSourcePosition2DPolar(mapping, object, azimuth, distance) : set a specific sound object position in a specified coordinate mapping, in polar coordinates (azimuth,distance), azimuth & distance are floats, range 0-1, output to default DS100 coordinate mapping with center @(0.5,0.5), and limits for (X,Y):(0,0)-(1,1).

- reverbSendGain(object, gain) : set the EnSpace reverb level send for a specific object

- matrixInputGain(object, gain) : set a specific sound object level
