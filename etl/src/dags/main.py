#!/usr/bin/env python
# -*- coding: utf-8 -*-

import configParser


config = configparser.ConfigParser()

config.read('config.ini')

print(config['SERVICE_URL'])
