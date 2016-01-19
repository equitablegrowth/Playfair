#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb

cgitb.enable()

data=cgi.FieldStorage()

try:
	filename=data.getfirst('loadfile')
except:
	pass

with open('/home/austinc/public_html/testtools/saved/'+filename,'rU') as f:
	r=f.read()

results=dumps(r)

print "Content-Type: text/html\n\n"
print r


