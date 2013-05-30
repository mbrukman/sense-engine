## The Sense Platform dashboard creation utilities

This package gives you everything you need to run your favorite programming language or console-based application as a dashboard on the Sense Platform's cloud infrastructure, using the same user interface as the officially-supported dashboards. 

User-defined dashboards are [[npm | npmjs.org]] modules that export a single function, which complies with the specification documented below. Their package.json files must have an entry called `sense`. There are three example dashboards to get you started in the examples folder.

To deploy a custom dashboard, simply stick it in `/home/sense/node_modules` in one of your projects. When you launch dashboards from that project in the future, the new dashboard type will be available in the drop-down menu.

### The exported function



### The `sense` entry in package.json



### Debugging from the command line

If your dashboard fails to launch on Sense, we'll do our best to report the error to you; but it's much easier to run your dashboard from a local command line while developing and debugging it, and then deploy to Sense after you're pretty sure it works.

To do this, simply type 

```javascript
require('sense-dashboard').cli(dashboardModuleName)
```

into node.js. All the dashboards in the examples folder have executable command-line versions in their `bin` folders.