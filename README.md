# Playfair

1. What is Playfair?
2. Features
3. Tutorial

## What is Playfair?

Playfair is a web app for graphing data. It was created to allow researchers at the Washington Center for Equitable Growth to assemble publication-ready graphs without having to rely on our (two person) design team. There are a lot of web graphing apps out there, but Equitable Growth has a fairly specific set of needs that required a unique solution. Playfair's major design priorities are:

1. Power and flexibility (ggplot2-style graphing)
2. Annotation and on-chart editing
3. Easy to deploy
4. Collaborative editing
5. Easy to theme

##### What isn't Playfair?
Playfair isn't as easy to use as most graphing apps. In particular, Playfair requires long data instead of wide data and people who aren't accustomed to working with data often find this confusing. Combined with the large number of options Playfair has, this makes Playfair best for users with some data analysis experience.

## Features

### Power and flexibility (ggplot2-style graphing)
A lot of graphing apps will make you a barchart or a linechart. But EG's needs are sometimes more technical. Sometimes we need a dot plot of coefficients from a statistical model with lines indicating confidence intervals. Charting in Playfair is modeled after the ggplot2 package for R. Playfair is not nearly so powerful, but it uses the ggplot2 concept of overlaying various chart elements on top of one another to create a complex chart. Playfair does not care what type of data you have - dates, numbers, and categories are all understood.

### Annotation and on-chart editing
Playfair includes a number of tools for adding annotations directly to a chart to help explain the graphic. These include adding arrows, callout lines, and arbitrary text annotations. On-chart editing refers to Playfair's tools for editing text, data, and other elements directly on the chart simply by dragging or right-clicking.

![alt text](assets/annotategif.gif "Annotating a graph")

### Easy to deploy
Playfair is super easy to deploy for even non-technical users. Clone this repository and open playfair.html. You've deployed playfair! If you want to use custom themes and save your graphs, you'll have to deploy Playfair to a server. This takes a little technical know-how but is basically as simple as uploading the Playfair folder to a server and changing the permissions for the scripts in the cgi-bin folder to 755.

### Collaborative Editing
Playfair allows you to save and load graphics you have made. There isn't much organization and there aren't permissions so this could get out of hand for a large organization but should meet the basic needs of small organizations.

### Easy to theme
Playfair's current theme system is largely undocumented but parameters are clearly named and it should be relatively easy to create your own theme. Moreover, you can change layout parameters from within the web app, which gives you a lot of flexibility in creating charts with unusual layouts.

![alt text](assets/themeexample.gif "The default theme")

## Tutorial
