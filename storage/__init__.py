#
# storage
#
# Copyright 2012 Konrad Markus
#
# Author: Konrad Markus <konker@gmail.com>
#

import sys
import time
from struct import pack
import logging


"""
Base class for storage of sensor data
"""
class BaseStorage():
    def __init__(self):
        pass

    def write_array(self, channel_id, array):
        raise NotImplementedError()


    def write_str(self, channel_id, s):
        raise NotImplementedError()


    def reader():
        raise NotImplementedError()


    def close(self):
        pass

