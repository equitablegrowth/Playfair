# What is Playfair?

Playfair is a web app for graphing data. It was created to allow researchers at the Washington Center for Equitable Growth to assemble publication-ready graphs without having to rely on our (two person) design team. There are a lot of web graphing apps out there, but Equitable Growth has a fairly specific set of needs that required a unique solution. Playfair's major design priorities are:

1. Power and flexibility (ggplot2-style graphing): a lot of graphing apps will make you a barchart or a linechart. But EG's needs are sometimes more technical. Sometimes we need a dot plot of coefficients from a statistical model with lines indicating confidence intervals. Charting in Playfair is modeled after the ggplot2 package for R. Playfair is not nearly so powerful, but it uses the ggplot2 concept of overlaying various chart elements on top of one another to create a complex chart. In Playfair you can 
