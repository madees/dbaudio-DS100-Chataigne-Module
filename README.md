# dbaudio-DS100-Chataigne-Module
Chataigne module to control d&amp;b audiotechnik DS100 matrix hardware with OSC protocol.  

To learn more about Chataigne, please visit : http://benjamin.kuperberg.fr/chataigne/  

To learn more about d&amp;b audiotechnik DS100, please visit : https://www.dbsoundscape.com/  

For global support on how to use Chataigne and its modules, please visit the forum : 
http://benjamin.kuperberg.fr/chataigne/forum 
or join us on Discord : 
https://discord.com/invite/ngnJ5z my contact there is "madees".

## Installation
To install the Custom Module, just copy the folder in My Documents\Chataigne\modules.
You'll find the module in the Module Manager>Hardware>Community Mpdules.

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
From now, in V1, only commands have been implemented and tested.
Here is the command list, if you need to know more about parameters type and ranges, please refer to the https://www.dbaudio.com/assets/products/downloads/manuals-documentation/electronics/dbaudio-osc-protocol-ds100-1.3.0-en.pdf :

### Global device
- deviceClear() : clear all DS100 settings

- reverbRoomId(id) : set the reverb room id (0=off, 1-9=room model)

- masterOutputLevel(gain) : set global output level with overwriting all DS100 outputs levels !!! Use with care

- nextScene() : switch to next scene

- previousScene() : switch to previous scene

- sceneRecall(majIndex, minIndex) : recal a specific scene. Scene index is split in two integers: majIndex.minIndex, max is 999.99

### Sound objects manipulation
- sourceSpread(object, spread) : set the spread parameter of a specific sound object

- sourceDelayMode(object, mode) : set the delay mode of a specific sound object

- coordinateMappingSourcePositionXY(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with DS100 cartesian XY standard limits (0,0)-(1,1)

- coordinateMappingSourcePosition2DCartesian(mapping, object, position) : set a specific sound object position in a specified coordinate mapping, with Chataigne Point2D axis (center @(0.5,0.5), limits (-1,-1)-(1,1)), output to standard DS100 coordinates.

- coordinateMappingSourcePosition2DPolar(mapping, object, azimuth, distance) : set a specific sound object position in a specified coordinate mapping, in polar coordinates (azimuth,distance), with center @(0.5,0.5). azimuth & distance are floats, range 0-1, output to standard DS100 coordinates.

- reverbSendGain(object, gain) : set the EnSpace reverb level send for a specific object

- matrixInputGain(object, gain) : set a specific sound object level
