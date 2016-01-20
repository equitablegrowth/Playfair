#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb
import os
from json import dumps

cgitb.enable()

files=os.listdir('/home/austinc/public_html/tools/saved/')
filelist=[]
for file in files:
	create=os.path.getctime('/home/austinc/public_html/tools/saved/'+file)
	filelist.append([file,create])

filelist.sort(key=lambda x:x[1])
filelist=list(reversed(filelist))

files=[file[0] for file in filelist]

results=dumps(files)

print "Content-Type: text/html\n\n"
print results