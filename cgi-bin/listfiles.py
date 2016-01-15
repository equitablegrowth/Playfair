#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb
import os
from json import dumps

cgitb.enable()

files=os.listdir('/home/austinc/public_html/testtools/saved/')
results=dumps(files)

print "Content-Type: text/html\n\n"
print results