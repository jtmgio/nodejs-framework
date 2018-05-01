"use strict";
var logger, colors, pkg, framework;
colors = require( "colors" );
logger = require("mm-node-logger")(module);
framework = require("./index");
pkg = require( "./package.json" );
const { config, express } = framework;
// Initialize server
function startServer() {
    // Initialize express
    var app = express.init( config, __dirname );
    // Start up the server on the port specified in the config
    app.listen(config.server.port, ()=>{
		const serverBanner = `\n
			************************************* ${ `EXPRESS SERVER`.yellow } ********************************************
			*
			* @module name: ${ config.module_name.toUpperCase().red }
			* @version: ${ pkg.version.red }
			* @service router: ${ config.server.host.toUpperCase().red }
			* @docker tag name: ${ config.docker_tag_name.toUpperCase().red }
			*
			* ${'App started on localhost port:'.blue } ${ config.server.port } ${' - with environment: '.blue } ${ config.environment.blue }
			*
			*************************************************************************************************
		`;		
		logger.info(serverBanner.replace( /\t/g, '' ) );

    });
    module.exports = app;
}
startServer();