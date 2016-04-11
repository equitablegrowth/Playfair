#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb
import os

data=cgi.FieldStorage()
path=os.path.realpath(__file__)
path='/'.join(path.split('/')[:-2])+'/themes/'

try:
	filename=data.getfirst('loadtheme')
except:
	pass

with open(path+filename,'rU') as f:
	r=f.read()

results=dumps(r)

print "Content-Type: text/html\n\n"
print r