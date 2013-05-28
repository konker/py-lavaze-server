#
# storage.csv
#
# Copyright 2013 Konrad Markus
#
# Author: Konrad Markus <konker@gmail.com>
#

import sys
import os
import re
import time
import csv
import logging

from storage import BaseStorage


"""
Implements storage of data records in a csv file.
"""
class Storage(BaseStorage):
    def __init__(self, filepath, headers=None):
        self.filepath = filepath

        if not os.path.exists(filepath):
            # assume a new file, so write headers, if any
            if headers:
                try:
                    with open(self.filepath, 'ab') as f:
                        writer = csv.writer(f)
                        writer.writerow(headers)

                except Exception as ex:
                    logging.error("Storage: Could not write headers to %s: %s" % (self.filepath, ex))
                    raise ex


    def type(self):
        return "CSV"


    def write_array(self, array):
        try:
            with open(self.filepath, 'ab') as f:
                writer = csv.writer(f)
                writer.writerow(array)

        except Exception as ex:
            logging.error("Storage: Could not write array to %s: %s" % (self.filepath, ex))
            raise ex


    def reader(self):
        try:
            with open(self.filepath, 'rb') as f:
                reader = csv.reader(f)
                for row in reader:
                    yield row
        except Exception as ex:
            logging.error("Storage: Error reading %s: %s" % (self.filepath, ex))
            raise ex


    def close(self):
        pass

