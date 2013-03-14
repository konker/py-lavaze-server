# -*- coding: utf-8 -*-
#
# lavaze.http.http
#
# Copyright 2013 Konrad Markus, HIIT
#
# Author: Konrad Markus <konker@gmail.com>
#

import os
import traceback
import time
import logging
import re
import json
import requests
import bottle
from bottle import template, static_file, request, response
from xml.dom import minidom

bottle.TEMPLATE_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), 'views')),
STATIC_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), 'static'))
TRIAL_ID = 'TRAIL0'


class HttpServer(object):
    def __init__(self, config):
        self.config = config
        self.devices = {}
        self.trials = {}

        # set up the routes manually
        bottle.route('/static/<filepath:path>', method='GET')(self.static)
        bottle.route('/', method='GET')(self.index)
        bottle.route('/GetSensorsInfo', method='GET')(self.get_sensors_info)
        # deprecated?
        bottle.route('/GetMaps', method='GET')(self.get_maps)
        # deprecated?
        bottle.route('/GetJS', method='GET')(self.get_js)
        bottle.route('/Log', method='GET')(self.get_log)
        bottle.route('/GetDevicesInfo', method='GET')(self.get_devices_info)
        bottle.route('/DevDebInfo', method='GET')(self.get_devices_debug_info)
        bottle.route('/TaskInfo', method='GET')(self.get_task_info)
        bottle.route('/InitTask', method='POST')(self.post_init_task)
        bottle.route('/StartTask', method='POST')(self.post_start_task)
        bottle.route('/StopTask', method='POST')(self.post_stop_task)
        bottle.route('/RestartTask', method='POST')(self.post_restart_task)

        # new routes
        #bottle.route('/Devices.json', method='GET')(self.get_devices)
        #bottle.route('/Tasks.json', method='GET')(self.get_tasks)
        bottle.route('/RegisterTrial.json', method='POST')(self.post_register_trial)
        bottle.route('/RegisterDevice.xml', method='POST')(self.post_register_device_xml)
        bottle.route('/RegisterDevice.json', method='POST')(self.post_register_device)
        #bottle.route('/StartTask.json', method='POST')(self.post_start_task)
        #bottle.route('/TaskAnswer.json', method='POST')(self.post_task_answer)
        #bottle.route('/NextTask.json', method='POST')(self.post_next_task)
        #bottle.route('/PreviousTask.json', method='POST')(self.post_prev_task)


    def post_register_trial(self):
        # parse the input txt
        trial_spec = request.body.read()
        trial = {}
        cur_id = None
        try:
            for l in trial_spec.splitlines():
                if l.startswith(COMMENT_CHAR):
                    continue
                elif re.match('^\s*(\d+)\s*$', l):
                    # Number of records. Ignore for now.
                    pass
                else:
                    # split a record
                    fields = re.split('\s+', l)
                    trial[fields[0]] = fields
        except:
            ret = {"status": "ERROR", "body": traceback.format_exc()}
            logging.error(traceback.format_exc())
            return json.dumps(ret)

        # NOTE: currently there is only 1 trial.
        # Re-uploading overwrites existing one, if any.
        trials[TRIAL_ID] = trial

        ret = {"status": "OK", "body": "Registered trial with %s tasks" % len(keys(trial))}
        return json.dumps(ret)

    
    def post_register_device_xml(self):
        impl = minidom.getDOMImplementation()
        # parse the input xml
        deviceIn = request.body.read()
        try:
            deviceIn = minidom.parse(device)

            device_id = deviceIn.attributes["device"].value
            device_type = deviceIn.attributes["type"].value

            device = {
                "id": device_id,
                "type": device_type,
                "server_timestamp": time.time() * 1000
            }
            

            self.devices[device_id] = device
            logging.info("Registered device: %s", device["id"])
        except:
            ret = impl.createDocument(None, "ContextML", None)
            ret.documentElement.appendChild(ret.createElement('ctxEL').appendChild(ret.createElement('error').appendChild(ret.createTextNone(traceback.format_exc()))))
            logging.error(traceback.format_exc())
            return ret.toxml()

        ret.documentElement.appendChild(ret.createElement('ctxEL').appendChild(ret.createElement('hello')))
        return ret.toxml()

    
    def post_register_device(self):
        # parse the input xml
        deviceIn = request.body.read()
        try:
            deviceIn = minidom.parse(device)

            device_id = deviceIn.attributes["device"].value
            device_type = deviceIn.attributes["type"].value

            device = {
                "id": device_id,
                "type": device_type,
                "server_timestamp": time.time() * 1000
            }
            

            self.devices[device_id] = device
            logging.info("Registered device: %s", device["id"])
        except:
            ret = {"status": "ERROR", "body": traceback.format_exc()}
            logging.error(traceback.format_exc())
            return json.dumps(ret)

        ret = {"status": "OK", "body": "Registered device: %s" % device["id"]}
        return json.dumps(ret)


    def start(self):
        logging.info("Http control server started on port %s." % self.config['http_port'])
        bottle.run(host=self.config['http_host'], port=self.config['http_port'], server='cherrypy', debug=False, quiet=True)


    def index(self):
        return static_file('index.html', root=STATIC_ROOT)

    
    def get_sensors_info(self):
        return "GET SENSORS INFO"

    
    def get_maps(self):
        return "GET MAPS"

    
    def get_js(self):
        return "GET JS"

    
    def get_log(self):
        return "GET LOG"

    
    def get_devices_info(self):
        return "GET DEVICES INFO"

    
    def post_init_task(self):
        return "POST INIT TASK"

    
    def get_devices_debug_info(self):
        return "GET DEV DEB INFO"

    
    def get_task_info(self):
        return "GET TASK INFO"

    
    def post_start_task(self):
        return "POST START TASK"

    
    def post_stop_task(self):
        return "POST STOP TASK"

    
    def post_restart_task(self):
        return "POST RESTART TASK"


    def static(self, filepath):
        if 'latest' in filepath:
            response.set_header('Cache-Control', 'No-store')

        return static_file(filepath, root=STATIC_ROOT)




