#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-
#
# py-lavaze-server
#
# Copyright 2013 Konrad Markus, HIIT
#
# Author: Konrad Markus <konker@gmail.com>
#

import sys
import os
import time

import pathhack
import logging
from optparse import OptionParser
import daemon

import json
from lavaze.http.http import HttpServer
from util.pidfile import PidFile


CONFIG_FILE = os.path.realpath(os.path.join(os.path.dirname(__file__),
                                'config', 'system.json'))


def main():
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)

    # expand paths
    config['logfile'] = abs_path(config['logfile'])
    config['datafile'] = abs_path_ts(config['datafile'])

    parser = OptionParser()
    parser.add_option('--debug', action='store_true', default=False,
                      help='log debugging messages too')

    parser.add_option('--log-stderr', dest='log_stderr',
                      action='store_true', default=False,
                      help='force log messages to stderr')

    parser.add_option('--foreground', '-f', dest='foreground',
                      action='store_true', default=False,
                      help='do not run as daemon')

    options, args = parser.parse_args()
    if args:
        parser.error('incorrect number of arguments')

    if options.foreground:
        lavaze_server(config, options)
    else:
        # NOTE: the pidfile path must be the same as $PIDFILE in the init.d script
        with daemon.DaemonContext(pidfile=PidFile('/var/run/lavaze-server.pid')):
            lavaze_server(config, options)


def lavaze_server(config, options):
    # configure logging
    if options.debug or config.get('debug', False):
        if options.log_stderr:
            logging.basicConfig(level=logging.DEBUG,
                                stream=sys.stderr,
                                format='%(asctime)s [%(threadName)s] %(message)s',
                                datefmt='%Y-%m-%d %H:%M:%S')
        else:
            logging.basicConfig(level=logging.DEBUG,
                                filename=config['logfile'],
                                format='%(asctime)s [%(threadName)s] %(message)s',
                                datefmt='%Y-%m-%d %H:%M:%S')
    else:
        if options.log_stderr:
            logging.basicConfig(level=logging.INFO,
                                stream=sys.stderr,
                                format='%(asctime)s %(message)s',
                                datefmt='%Y-%m-%d %H:%M:%S')
        else:
            logging.basicConfig(level=logging.INFO,
                                filename=config['logfile'],
                                format='%(asctime)s %(message)s',
                                datefmt='%Y-%m-%d %H:%M:%S')

    # start http server
    http_server = HttpServer(config)
    http_server.start()


def abs_path(path):
    return os.path.realpath(os.path.join(os.path.dirname(__file__), path))


def abs_path_ts(path):
    f, ext = os.path.splitext(os.path.basename(path))
    return os.path.realpath(os.path.join(os.path.dirname(__file__), os.path.dirname(path), "%s_%s%s" % (f, int(time.time()), ext)))


if __name__ == '__main__':
    main()


