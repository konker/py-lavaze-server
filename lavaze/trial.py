# -*- coding: utf-8 -*-
#
# lavaze.trial
#
# Copyright 2013 Konrad Markus, HIIT
#
# Author: Konrad Markus <konker@gmail.com>
#


class Trial:
    def __init__(self, tasks=None):
        self.set_tasks(tasks)
        self.markers = []
        self.index = {}

    def set_tasks(self, tasks):
        self.tasks = tasks
        if tasks:
            for t in range(len(self.tasks)):
                self.index[tasks[t]['id']] = t


    def next_task_id(self, task_id):
        task_index = self.index.get(task_id, -1)
        if not task_index == -1:
            if task_index < len(self.tasks):
                return self.tasks[task_index + 1]['id']

        return None

