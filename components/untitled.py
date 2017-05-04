import pandas as pd
pd.options.display.width=200

loc='/Users/austinclemens/Desktop/cps_00001.dat'
data=pd.read_fwf(loc,widths=[4,5,10,2,1,2,2,10,2,1,2,4,2,8],names=['YEAR','SERIAL','HWTSUPP','STATEFIP','ASECFLAG','MONTH','PERNUM','WTSUPP','LINENO','NCHILD','FAMUNIT','RELATE','AGE','INCTOT'],header=None)

# group by serial and famunit
# create a new total family income var
data.INCTOT[data['INCTOT']>99999997]=0
data['faminc']=data.groupby(by=['SERIAL','FAMUNIT'])['INCTOT'].transform('sum')

# create a new # of people var
data['familysize']=data.groupby(by=['SERIAL','FAMUNIT'])['FAMUNIT'].transform('count')

# create a new # of children var
data['children']=data.groupby(by=['SERIAL','FAMUNIT'])['NCHILD'].transform('max')
data['under18']=data[data['AGE']<19].groupby(by=['SERIAL','FAMUNIT'])['AGE'].transform('count')
data['under18']=data['under18'].fillna(0)
data.children[data['children']==0]=data[data['children']==0].groupby(by=['SERIAL','FAMUNIT'])['under18'].transform('max')

# create the equivalized scaling var
data['equivscale']=0
# parameter1
data.equivscale[(data['children']==0) & (data['familysize']<3)]=pow(data[(data['children']==0) & (data['familysize']<3)]['familysize'],.5)
#parameter2
data['adults']=data['familysize']-data['children']
data.equivscale[(data['adults']==1) & (data['children']>0)]=pow(1.8+.5*(data[(data['adults']==1) & (data['children']>0)]['children']-1),.7)
#parameter3
data.equivscale[(data['equivscale']==0)]=pow(data[(data['equivscale']==0)]['adults']+(.5*data[(data['equivscale']==0)]['children']),.7)

# reduce observations to 1 per family
data2=data.drop_duplicates(subset=['SERIAL','FAMUNIT'])

# create income distribution






# functions to take care of weighted percentiles
def weighted_cuts(df,var,weight,perc=[.25,.5,.75]):
	sep=[float('inf')]
	a=df[[var,weight]]
	a=a.sort_values(var)
	b=list(a[weight].cumsum())
	totalpop=a[weight].sum()
	cuts=[per*totalpop for per in perc]
	prevvalue=0
	for i,x in enumerate(b):
		for cut in cuts:
			if prevvalue<=cut and x>cut:
				sep.append((a.iloc[i][var]+a.iloc[i-1][var])/2)
		prevvalue=x
	sep.append(float('inf'))
	return sep

def assign_sters(value,sters):
	if value<=sters[1]:
		return 0
	if value<=sters[2]:
		return 1
	if value<=sters[3]:
		return 2
	if value<=sters[4]:
		return 3
	return 4