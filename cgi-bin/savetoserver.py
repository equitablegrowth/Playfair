#!/usr/bin/python
from __future__ import division
import cgi
from json import dumps
import cgitb

cgitb.enable()

data=cgi.FieldStorage()
filename=data.getfirst('filename')
# svg=data.getfirst('svg')
chartobject=data.getfirst('chartobject')

f = open('/home/austinc/public_html/testtools/saved/'+filename+'.pf','w')
# f.write(svg)
f.write(chartobject)
f.close()

print "Content-Type: text/html\n\n"
print 'success'