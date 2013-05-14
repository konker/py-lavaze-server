py-lavaze-server
==============================================================================

This is a device control server for field test 1 designed to run on a netbook.
It provides a UI for configuring a field test, and for also actually performing
the field test and storing the results.


Server config
------------------------------------------------------------------------------
The configuration for the server itself is stored in config/system.json
The configuration file is in JSON format <http://www.json.org/>.
The available fields in the configuration file are as follows:

    // The location of the server logfile
    logfile: <string path to log file>

    // The location of the data file where field test results are stored
    // in CSV format
    datafile: <string path to data file>

    // Whether to run the server in debug mode
    // (currently this gives slightly more verbose logging)
    debug: <boolean>

    // The location of the server logfile
    http_host: <string hostname for http server>

    // The location of the server logfile
    http_port: <int port for http server>


Starting/Stopping the server
------------------------------------------------------------------------------
The server is integrated with init.d and as such should start automatically on
boot. It can be manually controlled by:
    $ sudo /etc/init.d/lavaze-server start | stop | status


Connecting the device
------------------------------------------------------------------------------
In order for the tablet/device and the server to communicate, the device must
connect to the Wi-Fi access point provided by the netbook. The access point is 
provided by the hostapd service. The configuration for the access point is in
/etc/hostapd/hostapd.conf. An example is provided in the project directory,
etc/hostapd.conf.
Hostapd can be controlled via init.d:
    $ sudo /etc/init.d/hostapd start | stop | status

(If the device is having trouble connecting to the access point, it can sometimes
help to restart hostapd)

The default credentials for the Wi-Fi access point are:
    SSID: EEEPC
    passphrase: 1234567890


Setting up a field test
------------------------------------------------------------------------------
1) Boot the netbook and make sure that lavaze-server and hostapd are running.
A quick way to check that lavaze server is running is to open a web browser to
http://localhost:8080/ (or whatever port you have configured in config/system.json)

2) Connect the tablet to the EEEPC Wi-Fi access point

3) Start the m-Loma field test 1 r1 application on the tablet

4) On the netbook open a web browser to http://localhost:8080/ (or whatever port you have configured in config/system.json)

5) Upload the task description file:
    - Click the blue "upload" button in the title bar of the "Tasks" panel
    - Choose a task description file from the filesystem, and upload.

   A list of tasks will be displayed in the "Tasks" panel.

   *NOTE*: the task description file is the same format as the external.dat file
   that is on the tablet.

6) Upload a field test configuration file:
    - Click the blue "upload" button in the title bar of the "Configuration" panel
    - Choose a field test configuration file from the filesystem and uplod.

   The markers specified in the configuration file will be displayed in the
   "Configuration" panel.

7) Create a subject
    - Click the blue "new" button in the title bar of the "Subjects" panel
    - Enter a subject id and a height in metres. The Subject id can be anything
        that you want.
    - Click "save" to save the subject.

   Subjects can be edited or deleted after they have been created.

   *NOTE*: To run a field test at least one subject must exist, *and* selected. A selected
   subject is highlighted in blue.

8) Select a device
   The "Devices" panel shows all devices that have successfully established a connection
   with the server. You must select one of these devices to perform a field test. A
   selected device is highlighted in blue.

   *NOTE*: you must manually refresh this panel by clicking the amber "refresh" button
   in the title bar.


Running the field test
------------------------------------------------------------------------------
Once preparation has been completed as described above, and:
    - The "Tasks" panel has a list of tasks
    - The "Configuration" panel has a set of markers
    - A subject has been selected
    - A device has been selected

You can begin the field test. Simply click on of the tasks to start.

The tablet should show the first test case. The server UI will automatically move focus
to the data entry field in the :"Answers" Panel.


Entering answers
------------------------------------------------------------------------------
The "Answers" panel is where data gathered from test subjects is entered.
It is split into 3 areas.

### Data entry fields
Answers can be in 2 different forms:
    1) an absolute distance estimate, in metres.
    2) an estimate relative to a marker, in metres.

There are 3 data entry fields.

To enter an absolute value, just enter the number and press "Enter".

To enter a relative value you need a distance estimate, a marker number,
and whether the estimate is before or after the marker.
    - The first field is the distance estimate.
    - The second field indicates that the estimate is before or after the marker,
      denoted by either '<' or '>' respectively.
    - The third field is the marker number.

e.g. To enter an estimate of "25m after marker 3" you would enter:
    25 > 3

To enter an estimate of "25m before marker 6" you would enter:
    25 < 6

*NOTE*: You do not need to manually switch the focus of the data entry text fields.
Focus will automatically switch when you type a '<' or '>' character.

### Timer
There is a timer which records the time spent on the field test.
This can be paused/started or reset at any time using the buttons below the timer display.

*NOTE*: when the data entry fields have focus, the timer can be paused/started by
pressing the space bar.

### Last answer
The area on the right of the "Answers" panel shows the last answer that was entered.
The display shows:
    - the actual distance of the test case
    - the estimate given by the subject
    - the time spent on that test case


Log
------------------------------------------------------------------------------
The "Log" panel at the bottom of the server UI displays the server log. This can be
checked in the case of errors/etc.

*NOTE*: you must manually refresh this panel by clicking the amber "refresh" button
in the title bar.


TODO
------------------------------------------------------------------------------
- Currently there is very little error handling
- Devices/subjects should be auto-selected if there is only 1
- Possibility of a task type which does not trigger a change on the tablet. This
  is for "warm-up" estimates at the begining which are estimating the distance of
  landmarks, etc. These could be numbered 0.0, 0.1, etc.
- Better documentation of usage
- Technical documentation for the system, setup, dependencies. etc.


