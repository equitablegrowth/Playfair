#!/usr/bin/python
from __future__ import division
import cgi
import cgitb
import os
from json import dumps

path=os.path.realpath(__file__)
path='/'.join(path.split('/')[:-2])+'/themes/'

files=os.listdir(path)
filelist=[]
for file in files:
	filelist.append([file])

filelist.sort(key=lambda x:x[0])

files=[file[0] for file in filelist]

results=dumps(filelist)

print "Content-Type: text/html"
print results

# print "Content-type: application/json"
# print response={'list':filelist}
# print json.JSONEncoder().encode(response)