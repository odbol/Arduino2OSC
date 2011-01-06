Arduino2OSC Bridge
Convert Arduino sensor data into OSC messages.

For Max/MSP 4.6.

More info: http://vjacket.com

Copyright 2010 Tyler Freeman
http://odbol.com

LICENSE:

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.



SETUP INSTRUCTIONS:

1. Load the code from "Arduino Code/Arduino2Max_OCT2007.pde" into your Arduino.
2. Load the Max patch "Arduino2OSC". 
3a. Load the Max patch "Arduino2MaxOctober2007V.4" and follow its instructions to connect to your 
Arduino. 
3b. Alternatively, you can use the "arduinoTest" patch to test your preset if you don't have an 
Arduino ready.
4. The Arduino2OSC patch should now show the sensor data coming from the Arduino. Shape it to your 
liking using the sliders and controls.
5. Choose an OSC message to send out with the value via the dropdowns. The entire OSC message will 
be sent, but the "${1}" in the OSC dropdown will be replaced with the value from the sensor. 
The current paths are only for Resolume Avenue, but you can change them in the code. 
6. Save your preset and use it later!