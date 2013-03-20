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
import csv
import requests
import bottle
from bottle import template, static_file, request, response
from xml.dom import minidom

bottle.TEMPLATE_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), 'views')),
STATIC_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), 'static'))
COMMENT_CHAR = '#'
TRIAL_ID = 'TRIAL0'
SUBJECT_ID = 'SUBJECT0'


#[TODO: move to own module]
class Trial:
    def __init__(self, tasks):
        self.tasks = tasks
        self.markers = []
        #self.start_task_id = None
        #self.stop_task_id = None
        self.index = {}
        for t in range(len(self.tasks)):
            self.index[tasks[t]['id']] = t


    def next_task_id(self, task_id):
        task_index = self.index.get(task_id, -1)
        if not task_index == -1:
            if task_index < len(self.tasks):
                return self.tasks[task_index + 1]['id']

        return None


class HttpServer(object):
    def __init__(self, config):
        self.config = config
        self.devices = {}
        self.subjects = {}
        self.trials = {}
        self.subject = None

        # set up the routes manually
        bottle.route('/static/<filepath:path>', method='GET')(self.static)
        bottle.route('/', method='GET')(self.index)

        '''
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
        #bottle.route('/RegisterDevice.json', method='POST')(self.post_register_device)
        #bottle.route('/NextTask.json', method='POST')(self.post_next_task)
        #bottle.route('/PreviousTask.json', method='POST')(self.post_prev_task)

        #bottle.route('/RegisterTasks.json', method='POST')(self.post_register_tasks)
        #bottle.route('/RegisterMarkers.json', method='POST')(self.post_register_markers)
        #bottle.route('/RegisterSubject.json', method='POST')(self.post_register_subject)
        '''

        # new routes
        bottle.route('/devices', method='GET')(self.get_devices)
        bottle.route('/devices', method='POST')(self.register_device_xml)

        bottle.route('/tasks', method='GET')(self.get_tasks)
        bottle.route('/tasks', method='POST')(self.register_tasks)
        bottle.route('/tasks/<id>/start', method='POST')(self.start_task)
        bottle.route('/tasks/<id>/stop', method='POST')(self.stop_task)
        bottle.route('/tasks/<id>/answer', method='POST')(self.task_answer)

        bottle.route('/markers', method='GET')(self.get_markers)
        bottle.route('/markers', method='POST')(self.register_markers)

        bottle.route('/subjects', method='GET')(self.get_subjects)
        bottle.route('/subjects', method='POST')(self.create_subject)
        bottle.route('/subjects/<id>', method='GET')(self.get_subject)
        bottle.route('/subjects/<id>', method='PUT')(self.update_subject)
        bottle.route('/subjects/<id>', method='DELETE')(self.delete_subject)


    def get_subjects(self):
        ret =  self.subjects.values()
        return json.dumps(ret)


    def create_subject(self):
        subject = request.body.read()
        try:
            subject = json.loads(subject)
            #[FIXME: validate]
        except:
            response.status = 500
            ret = {"status": "ERROR", "body": traceback.format_exc()}
            logging.error(traceback.format_exc())
            return json.dumps(ret)

        if subject['name'] == None or subject['height'] == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}

        else:
            #[XXX: only one subject at a time]
            subject_id = SUBJECT_ID
            subject = {
                'id': subject_id,
                'name': subject['name'],
                'height': subject['height'],
                'notes': subject['notes']
            }
            self.subjects[subject_id] = subject
            ret = subject

        return json.dumps(ret)


    def get_subject(self, id):
        if not id in self.subjects:
            response.status = 404
            ret = {"status":"ERROR", "body":"Subject not found"}
        else:
            ret = self.subjects[id]

        return json.dumps(ret)


    def update_subject(self, id):
        subject = request.body.read()
        try:
            subject = json.loads(subject)
            #[FIXME: validate]
        except:
            response.status = 500
            ret = {"status": "ERROR", "body": traceback.format_exc()}
            logging.error(traceback.format_exc())
            return json.dumps(ret)

        if not id in self.subjects:
            response.status = 404
            ret = {"status":"ERROR", "body":"Subject not found"}
        else:
            self.subjects[id]['name'] = subject['name']
            self.subjects[id]['height'] = subject['height']
            self.subjects[id]['notes'] = subject['notes']

            ret = self.subjects[id]

        return json.dumps(ret)


    def delete_subject(self, id):
        if not id in self.subjects:
            response.status = 404
            ret = {"status":"ERROR", "body":"Subject not found"}
        else:
            del self.subjects[id]
            ret = {"status":"OK", "body":"Item deleted"}

        return json.dumps(ret)

    
    def task_answer(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)
        subject_id = request.forms.get('subject_id', None)
        time_secs = request.forms.get('time_secs', None)
        answer = request.forms.get('answer', None)

        if device_id == None or subject_id == None  or time_secs == None or answer == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}

        elif trial_id not in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}

        elif not subject_id in self.subjects:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such subject id"}

        else:
            #[TODO: parse answer]
            answer = self.parse_answer(answer)

            #[TODO: write answer to data]
            print answer

            # Automatically go to next task
            #self.devices[device_id]['start_task_id'] = self.trials[trial_id].next_task_id(id)
            #self.devices[device_id]['stop_task_id'] = None

            ret = {"status": "OK", "body": "Task %s answered" % id}

        return json.dumps(ret)

    
    def parse_answer(self, answer):
        if '<' in answer:
            rel, marker = answer.split('<')
        return answer

    
    def stop_task(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)

        if device_id == None or id == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}

        elif not trial_id in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}

        elif not id in self.trials[trial_id].index:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such task id"}

        else:
            self.devices[device_id]['start_task_id'] = None
            self.devices[device_id]['stop_task_id'] = id
            ret = {"status": "OK", "body": "Stopped task %s" % id}

        return json.dumps(ret)

    
    def start_task(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)

        if device_id == None or id == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}

        elif not trial_id in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}

        elif not id in self.trials[trial_id].index:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such task id"}

        else:
            self.devices[device_id]['start_task_id'] = id
            self.devices[device_id]['stop_task_id'] = None
            ret = {"status": "OK", "body": "Stopped task %s" % id}

        return json.dumps(ret)


    def get_devices(self):
        #ret = {"status": "OK", "body": self.devices}
        ret =  self.devices.values()
        return json.dumps(ret)


    def get_tasks(self):
        trial_id = request.query.get('trial_id', TRIAL_ID)
        if trial_id in self.trials:
            #ret = {"status": "OK", "body": self.trials[trial_id].tasks}
            ret = self.trials[trial_id].tasks
        else:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        return json.dumps(ret)


    def get_markers(self):
        trial_id = request.query.get('trial_id', TRIAL_ID)
        if trial_id in self.trials:
            #ret = {"status": "OK", "body": self.trials[trial_id].tasks}
            ret = self.trials[trial_id].markers
        else:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        return json.dumps(ret)


    def register_markers(self):
        trial_id = request.query.get('trial_id', TRIAL_ID)
        if not trial_id in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
        else:
            # parse the input txt
            markers = []
            try:
                markers_spec = request.files.get('markers-spec[]').file
                for l in markers_spec:
                    l = l.rstrip()
                    if l.startswith(COMMENT_CHAR):
                        continue
                    else:
                        # split a record, tab delimited
                        fields = re.split('\s+', l)
                        marker = {
                            'id': fields[0],
                            'x': fields[1],
                            'y': fields[2],
                            'color': fields[3]
                        }
                        markers.append(marker)
            except:
                response.status = 500
                ret = {"status": "ERROR", "body": traceback.format_exc()}
                logging.error(traceback.format_exc())
                return json.dumps(ret)

            # NOTE: currently there is only 1 trial.
            # Re-uploading markers overwrites existing spec, if any.
            self.trials[trial_id].markers = markers

            ret = {"status": "OK", "body": "Registered %s markers" % len(markers)}

        return json.dumps(ret)


    def register_tasks(self):
        # parse the input txt
        tasks = []
        cur_id = None
        try:
            tasks_spec = request.files.get('tasks-spec[]').file
            for l in tasks_spec:
                l = l.rstrip()
                if l.startswith(COMMENT_CHAR):
                    continue
                elif re.match('^\s*(\d+)\s*$', l):
                    # Number of records. Ignore for now.
                    pass
                else:
                    # split a record, tab delimited
                    fields = re.split('\s+', l)
                    task = {
                        'id': fields[0],
                        'f1': fields[1],
                        'f2': fields[2],
                        'f3': fields[3],
                        'f4': fields[4],
                        'f5': fields[5],
                        'f6': fields[6],
                        'f7': fields[7],
                        'f8': fields[8],
                        'f9': fields[9]
                    }
                    tasks.append(task)
        except:
            response.status = 500
            ret = {"status": "ERROR", "body": traceback.format_exc()}
            logging.error(traceback.format_exc())
            return json.dumps(ret)

        # NOTE: currently there is only 1 trial.
        # Re-uploading overwrites existing one, if any.
        self.trials[TRIAL_ID] = Trial(tasks)

        ret = {"status": "OK", "body": "Registered trial with %s tasks" % len(tasks)}
        return json.dumps(ret)

    
    def register_device_xml(self):
        impl = minidom.getDOMImplementation()
        ret = impl.createDocument(None, "ContextML", None)

        # parse the input xml
        deviceIn = request.body.read()
        print deviceIn
        try:
            deviceIn = minidom.parseString(deviceIn)

            device_id = deviceIn.documentElement.attributes["device"].value
            device_type = deviceIn.documentElement.attributes["type"].value
            server_timestamp = time.time() * 1000

            device = {
                "id": device_id,
                "type": device_type,
                "server_timestamp": server_timestamp
            }
            
            if not device_id in self.devices:
                device["first_server_timestamp"] = server_timestamp
                device["start_task_id"] = None
                device["stop_task_id"] = None
                self.devices[device_id] = device
            else:
                self.devices[device_id].update(device)

            logging.info("Registered device: %s", device["id"])
        except:
            ret.documentElement.appendChild(ret.createElement('ctxEL').appendChild(ret.createElement('error').appendChild(ret.createTextNode(traceback.format_exc()))))
            logging.error(traceback.format_exc())
            return ret.toxml()

        #[FIXME: proper output]
        ret = self.get_device_response_xml(device_id, ret)
        print ret.toxml()
        return ret.toxml()

    
    def get_device_response_xml(self, device_id, ret):
        ctxEL = ret.createElement('ctxEl')
        start_task_id = self.devices[device_id]['start_task_id']
        stop_task_id = self.devices[device_id]['stop_task_id']

        if start_task_id or start_task_id:
            taskEl = ret.createElement('task')
            taskEl.appendChild(ret.createTextNode(self.devices[device_id]['start_task_id'][4:]))
            ctxEL.appendChild(taskEl)

            # [XXX: only one subject at a time]
            userHeightEl = ret.createElement('userHeight')
            userHeightEl.appendChild(ret.createTextNode(self.subjects[SUBJECT_ID]['height']))
            ctxEL.appendChild(userHeightEl)

            operationEl = ret.createElement('operation')
            if start_task_id:
                operationEl.appendChild(ret.createTextNode('start'))
                self.devices[device_id]['start_task_id'] = None
            else:
                operationEl.appendChild(ret.createTextNode('stop'))
                self.devices[device_id]['stop_task_id'] = None

            ctxEL.appendChild(operationEl)


        ret.documentElement.appendChild(ctxEL)
        return ret


    def start(self):
        logging.info("Http control server started on port %s." % self.config['http_port'])
        bottle.run(host=self.config['http_host'], port=self.config['http_port'], server='cherrypy', debug=False, quiet=True)


    def index(self):
        return static_file('index.html', root=STATIC_ROOT)


    def static(self, filepath):
        if 'latest' in filepath:
            response.set_header('Cache-Control', 'No-store')

        return static_file(filepath, root=STATIC_ROOT)



#--- scrap
'''
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
    

    def register_subject(self):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        subject_id = request.forms.get('subject_id', None)
        subject_height = request.forms.get('subject_height', None)

        if subject_id == None or subject_height == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}

        elif trial_id not in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}

        else:
            self.subject = {
                'id': subject_id,
                'height': subject_height,
                'server_timestamp': time.time() * 1000
            }
            ret = {"status": "OK", "body": "Subject registered: %s" % subject_id}

        return json.dumps(ret)

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

    
    def post_stop_task(self):
        return "POST STOP TASK"

    
    def post_restart_task(self):
        return "POST RESTART TASK"
'''

'''
POA
-----
- markers
    O render markers in canvas
    - make markers clickable?
- devices
    - make device selectable
- subjects
    - make subject selectable
    - make subjects editable
    - make subjects deleteable?
- tasks
    - make tasks selectable
- answer
    - add answer input section
- storage
    - write to data file
        - csv?
'''


