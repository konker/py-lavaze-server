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
from storage.csv_storage import Storage
from lavaze.trial import Trial


bottle.TEMPLATE_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), 'views')),
STATIC_ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), 'static'))
COMMENT_CHAR = '#'
TRIAL_ID = 'TRIAL0'
SUBJECT_ID = 'SUBJECT0'
STORAGE_HEADERS = ['timestamp', 'trial_id', 'device_id', 'subject_id', 'subject_height',
                   'task_id', 'answer_abs', 'answer_raw', 'time_secs']


class HttpServer(object):
    def __init__(self, config):
        self.config = config
        self.devices = {}
        self.subjects = {}
        self.trials = {
            TRIAL_ID: Trial()
        }

        self.storage = Storage(self.config['datafile'], STORAGE_HEADERS)

        # set up the routes manually
        bottle.route('/static/<filepath:path>', method='GET')(self.static)
        bottle.route('/', method='GET')(self.index)
        bottle.route('/log', method='GET')(self.get_log)

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


    def start(self):
        logging.info("Http control server started on port %s." % self.config['http_port'])
        bottle.run(host=self.config['http_host'], port=self.config['http_port'], server='cherrypy', debug=False, quiet=True)


    def index(self):
        return static_file('index.html', root=STATIC_ROOT)


    def static(self, filepath):
        if 'latest' in filepath:
            response.set_header('Cache-Control', 'No-store')

        return static_file(filepath, root=STATIC_ROOT)


    def get_log(self):
        lines = request.query.n or 10
        stdin,stdout = os.popen2("tail -n %s %s" % (lines, self.config['logfile']))
        stdin.close()
        log = stdout.readlines()
        stdout.close()
        ret = [{'log': l} for l in log] 
        return json.dumps(ret)


    def get_devices(self):
        ret =  self.devices.values()
        return json.dumps(ret)

    
    def register_device_xml(self):
        impl = minidom.getDOMImplementation()
        ret = impl.createDocument(None, "ContextML", None)

        # parse the input xml
        deviceIn = request.body.read()
        logging.debug("register_device_xml: got: %s" % deviceIn)

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

            ret = self._get_device_response_xml(device_id, ret)
            logging.info("register_device_xml: registered device: %s", device["id"])
        except:
            ret = self._get_device_error_response_xml(traceback.format_exc(), ret)
            logging.error(traceback.format_exc())

        logging.debug("register_device_xml: sending xml: %s" % ret.toxml())
        return ret.toxml()


    def get_tasks(self):
        trial_id = request.query.get('trial_id', TRIAL_ID)
        if trial_id in self.trials:
            ret = self.trials[trial_id].tasks
        else:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
            logging.error("get_tasks: no such trial id: %s" % trial_id)

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
        self.trials[TRIAL_ID].set_tasks(tasks)

        ret = {"status": "OK", "body": "Registered trial with %s tasks" % len(tasks)}
        logging.info("register_tasks: registered trial with %s tasks" % len(tasks))
        return json.dumps(ret)

    
    def start_task(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)

        if device_id == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}
            logging.error("start_task: bad parameters: %s" % device_id)

        elif not trial_id in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
            logging.error("start_task: no such trial id: %s" % trial_id)

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}
            logging.error("start_task: no such device id: %s" % device_id)

        elif not id in self.trials[trial_id].index:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such task id"}
            logging.error("start_task: no such task id: %s" % id)

        else:
            self.devices[device_id]['start_task_id'] = id
            self.devices[device_id]['stop_task_id'] = None
            ret = {"status": "OK", "body": "Started task %s" % id}
            logging.info("start_task: started task %s" % id)

        return json.dumps(ret)

    
    def stop_task(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)

        if device_id == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}
            logging.error("stop_task: bad parameters: %s" % device_id)

        elif not trial_id in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
            logging.error("stop_task: no such trial id: %s" % trial_id)

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}
            logging.error("stop_task: no such device id: %s" % device_id)

        elif not id in self.trials[trial_id].index:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such task id"}
            logging.error("stop_task: no such task id: %s" % id)

        else:
            self.devices[device_id]['start_task_id'] = None
            self.devices[device_id]['stop_task_id'] = id
            ret = {"status": "OK", "body": "Stopped task %s" % id}
            logging.info("stop_task: stopped task %s" % id)

        return json.dumps(ret)

    
    def task_answer(self, id):
        trial_id = request.forms.get('trial_id', TRIAL_ID)
        device_id = request.forms.get('device_id', None)
        subject_id = request.forms.get('subject_id', None)
        timestamp = request.forms.get('timestamp', None)
        time_secs = request.forms.get('time_secs', None)
        answer = request.forms.get('answer', None)

        if device_id == None or subject_id == None or time_secs == None or timestamp == None or answer == None:
            response.status = 500
            ret = {"status":"ERROR", "body":"Bad parameters"}
            logging.error("task_answer: bad parameters: %s" % device_id)

        elif trial_id not in self.trials:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
            logging.error("task_answer: no such trial id: %s" % trial_id)

        elif not device_id in self.devices:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such device id"}
            logging.error("task_answer: no such device id: %s" % device_id)

        elif not subject_id in self.subjects:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such subject id"}
            logging.error("task_answer: no such subject id: %s" % id)

        else:
            #[TODO: parse answer]
            answer_abs, answer_raw = self._parse_answer(trial_id, answer)

            # write answer to data file
            record = [timestamp, trial_id, device_id, self.subjects[subject_id]['name'], self.subjects[subject_id]['height'],
                      id, answer_abs, answer_raw, time_secs] 
            self.storage.write_array(record)
            logging.debug("task_answer: wrote record: %s" % record)

            ret = {"status": "OK", "body": "Task %s answered" % id}
            logging.info("task_answer: answered task %s" % id)

        return json.dumps(ret)


    def get_markers(self):
        trial_id = request.query.get('trial_id', TRIAL_ID)
        if trial_id in self.trials:
            ret = self.trials[trial_id].markers
        else:
            response.status = 500
            ret = {"status":"ERROR", "body":"No such trial id"}
            logging.error("get_markers: no such trial id: %s" % trial_id)

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
                            'x': float(fields[1]),
                            'y': float(fields[2]),
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
            logging.info("register_markers: registered %s markers" % len(markers))

        return json.dumps(ret)


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
            logging.error("create_subject: bad parameters: %s" % subject)

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
            logging.info("create_subject: created subject: %s" % subject)

        return json.dumps(ret)


    def get_subject(self, id):
        if not id in self.subjects:
            response.status = 404
            ret = {"status":"ERROR", "body":"Subject not found"}
            logging.error("get_subject: subject not found: %s" % id)
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
            logging.error("get_subject: subject not found: %s" % id)
        else:
            self.subjects[id]['name'] = subject['name']
            self.subjects[id]['height'] = subject['height']
            self.subjects[id]['notes'] = subject['notes']

            ret = self.subjects[id]
            logging.info("update_subject: updated subject: %s" % subject)

        return json.dumps(ret)


    def delete_subject(self, id):
        if not id in self.subjects:
            response.status = 404
            ret = {"status":"ERROR", "body":"Subject not found"}
            logging.error("delete_subject: subject not found: %s" % id)
        else:
            del self.subjects[id]
            ret = {"status":"OK", "body":"Item deleted"}
            logging.info("delete_subject: subject deleted: %s" % id)

        return json.dumps(ret)

    
    def _parse_answer(self, trial_id, answer):
        abs = -1
        if '<' in answer:
            rel, marker = answer.split('<')
            marker = int(marker) - 1
            if marker > -1 and marker < len(self.trials[trial_id].markers):
                y = self.trials[trial_id].markers[marker]['y']
                abs = y - float(rel)

        elif '>' in answer:
            rel, marker = answer.split('>')
            marker = int(marker) - 1
            if marker > -1 and marker < len(self.trials[trial_id].markers):
                y = self.trials[trial_id].markers[marker]['y']
                abs = y + float(rel)

        else:
            abs = answer

        return abs, answer

    
    # Helpers
    def _get_device_error_response_xml(self, error, ret):
        ctxEL = ret.createElement('ctxEl')

        errorEl = ret.createElement('error')
        errorEl.appendChild(ret.createTextNode(error))

        ctxEl.appendChild(errorEl)

        ret.documentElement.appendChild(ctxEl)
        return ret


    def _get_device_response_xml(self, device_id, ret):
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

