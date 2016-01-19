#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb

cgitb.enable()

data=cgi.FieldStorage()

try:
	filename=data.getfirst('filename')
except:
	pass

try:
	svg=data.getfirst('svg')
except:
	pass

try:
	chartobject=data.getfirst('chartobject')
except:
	pass

try:
	inputs=data.getfirst('inputs')
except:
	pass

f = open('/home/austinc/public_html/testtools/saved/'+filename,'w')

try:
	f.write(svg)
	f.write('\n')
except:
	pass

try:
	f.write(chartobject)
	f.write('\n')
except:
	pass

try:
	f.write(inputs)
except:
	pass

try:
	f.close()
except:
	pass

print "Content-Type: text/html\n\n"
print data


