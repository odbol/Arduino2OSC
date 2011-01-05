Arduino2OSC Bridge.

For Max/MSP 4.6.

1. Load the code from "Arduino Code/Arduino2Max_OCT2007.pde" into your Arduino.
2. Run the Max patch "Arduino2OSC". 
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