#!/usr/bin/python
from __future__ import division
import cgi
import cgitb
import os
from json import dumps

path=os.path.realpath(__file__)
path='/'.join(path.split('/')[:-2])+'/maps/'

files=os.listdir(path)
filelist=[]
for file in files:
	create=os.path.getctime(path+file)
	filelist.append([file,create])

filelist.sort(key=lambda x:x[1])
filelist=list(reversed(filelist))

files=[file[0] for file in filelist]

results=dumps(files)

print "Content-Type: text/html\n\n"
print results