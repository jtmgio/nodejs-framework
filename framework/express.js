"use strict";
/**
 * Module dependencies.
 */
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const multer = require("multer");
const logger = require("mm-node-logger")(module);
const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const pathUtils = require("./path-utils");
const _ = require("lodash");
const serveStatic = require("serve-static");
const finalHandler = require("finalhandler");
const fs = require("fs");
const cookieParser = require("cookie-parser");
let config = require("./config");
let serverRoute = "";


/**
 * Initialize application middleware.
 *
 * @method initMiddleware
 * @param {Object} app The express application
 * @private
 */
function initMiddleware(app, config, routePath ) {
	serverRoute = routePath;
	//blend config
	fnBlendConfigs( config );

	// Showing stack errors
	app.set("showStackError", true);
	// Enable jsonp
	app.enable("jsonp callback");
	// Environment dependent middleware
	if (config.environment === "development") {
		// Enable logger (morgan)
		app.use(morgan("dev"));
		// Disable views cache
		app.set("view cache", false);
	} else if (config.environment === "production") {
		app.locals.cache = "memory";
	}
	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());

	// views as directory for all template files
	app.set("views", path.join(routePath, "views"));
	//html is our default enging
	app.engine("html", require("ejs").renderFile);
	app.set("view engine", "html");
	// instruct express to server up static assets
	app.use(express.static("../../public"));

	//intercept/overload the render function
	//append dev or not if we are in development
	app.use( overloadRenderFn );
	
	//intercept all request	and rewrite urls
	app.use( rewriteAssetsRequestFn );	

	/*
	** method - set gobals
	** desc - this will set glabals for the app
	*/

	//use cookie parser
	app.use( cookieParser() );
	
	app.use( function( req, res, next ){
		//set the locals
		app.locals.mcid_token = req.cookies.mcid_token;
		app.locals.service_id = req.cookies.serviceID;
		app.locals.domain = "http://" + config.server.host;
		next();
	});

}
/*
**-------------------------------------------------------------------------------------
** METHOD NAME - rewriteAssetsRequestFn
** DESC - This will rewrite the request views
**-------------------------------------------------------------------------------------
*/
function rewriteAssetsRequestFn( req, res, next ){
	var url = req.url.split( "/" );
	if( _.indexOf( url, "public" ) === -1 && _.indexOf( url, "views" ) === -1 ){
		//remove the module and module version
		url = _.without( url, config.module_name, config.module_version );
		req.url = url.length === 0 ? "/" : url.join( "/" );
		
		var end_point = _.last( url );

		if( end_point == "health-check" ){
			next();
			return;
		}
		//if we want to return test json data 
		if( config.use_static_json && end_point.length ){
			//for each response type we will send back a response or fall through to the actually route
			if( req.method === 'GET' ){
				fnLoadJSONData( end_point, res, next );
			}
			if( req.method === "POST" ){
				res.status( 201 );
			}
			if( req.method === "DELETE" || req.method === "PUT" ){
				res.status( 204 );
			}
			//stop processing since we don't nee to go to the routes anymore
			return;
		}
	}
	next();
}
/*
**-------------------------------------------------------------------------------------
** METHOD NAME - fnLoadJSONData	
** DESC - This will load the JSON data stored in the "data" folder
**-------------------------------------------------------------------------------------
*/
function fnLoadJSONData( end_point, res, next ){
	//get the full path of the response
	var json_path =  "data/" + end_point + ".json";
	json_path = path.join( serverRoute, json_path )
	//if we exists lets deploy the json
	if( fs.existsSync( json_path ) ){
		var json = require( json_path );
		res.status( 200 ).send( json );
		//stop processing
		return;
	}	
	//we didn't find it so ignore this and fall through to the next route
	next();
}
/*
**-------------------------------------------------------------------------------------
** METHOD NAME - fnBlendConfigs
** DESC - This will try to blend the configs
**-------------------------------------------------------------------------------------
*/
function fnBlendConfigs( custom_config ){
	try{
		config = _.defaults( custom_config, config );
	}catch( e ){
	}
}
/*
**-------------------------------------------------------------------------------------
** METHOD NAME - 
** DESC - 
**-------------------------------------------------------------------------------------
*/
function overloadRenderFn(req, res, next) {
	// grab reference of render
	var _render = res.render;
	//call my intercept then broadcast
	res.render = function(view, options, fn) {
		var view_parts;
		view_parts = view.split(".");
		//view_parts.splice(-1, 1);
		view = view_parts.join(".") + config.file_exts;
		_render.call(this, view, options, fn);
	};
	next();
}


/**
 * Configure Helmet headers configuration.
 *
 * @method initHelmetHeaders
 * @param {Object} app The express application
 * @private
 */

function initHelmetHeaders(app) {
	// Use helmet to secure Express headers
	app.use(helmet.frameguard());
	app.use(helmet.xssFilter());
	app.use(helmet.noSniff());
	app.use(helmet.ieNoOpen());
	app.disable("x-powered-by");
}
/**
 * Configure CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests.
 *
 * @method initCrossDomain
 * @param {Object} app The express application
 * @private
 */

function initCrossDomain(app) {
	// setup CORS
	app.use(cors());
	app.use(function(req, res, next) {
		// Website you wish to allow to connect
		res.set("Access-Control-Allow-Origin", req.get( "host" ) );
		// Request methods you wish to allow
		res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
		// Request headers you wish to allow
		res.set("Access-Control-Allow-Headers", "Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token");
		// Pass to next layer of middleware
		next();
	});
}
/**
 * Configure app modules config files.
 *
 * @method initGonfig
 * @param {Object} app The express application
 * @private
 */

function initGonfig(app, rootPath) {
	// Globbing config files
	pathUtils.getGlobbedPaths(path.join(rootPath, "routes/**/*.config.js")).forEach(function(routePath) {
		require(path.resolve(routePath))(app);
	});
}
/**
 * Configure app routes.
 *
 * @method initRoutes
 * @param {Object} app The express application
 * @private
 */

function initRoutes(app, rootPath) {
	// Globbing routing files
	pathUtils.getGlobbedPaths(path.join(rootPath, "routes/**/*.routes.js")).forEach(function(routePath) {
		require(path.resolve(routePath))(app);
	});
}
/**
 * Configure error handling.
 *
 * @method initErrorRoutes
 * @param {Object} app The express application
 * @private
 */

function initErrorRoutes( app, rootPath ) {
	// Assume "not found" in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function(err, req, res, next) {
		// If the error object doesn"t exists
		if (!err) {
			return next();
		}
		// Log it
		logger.error("Internal error(%d): %s", res.statusCode, err.stack);
		// Redirect to error page
		res.sendStatus(500);
	});
	
	// Assume 404 since no middleware responded
	// inject assets if found if not 404
	app.use(function(req, res) {
		var static_path, serve, done;
		var url = req.url.split( "/" );
		
		//set the static path
		//added to serve view template static files

		if( req.url.indexOf( "views" ) > -1 ){
			static_path = path.join(rootPath, "../public" );
			req.url = req.url.replace( "views/", "" );
		}else{
			static_path = path.join(rootPath, "../public" );
		}

		url = _.without( url, config.module_name, config.module_version );
		
		//if we really dont have a path/file its a 404			
		if( !fileExists( path.join( static_path, url.join( "/" ) ) ) ){
			res.sendStatus( 404 );
			res.end();
			return;
		}
		//run the serving of static files			
		serve = serveStatic( static_path );
		done = finalHandler(req, res);
		serve( req, res, done );
	});
	
}
/**
 *
 * @method fileExists
 * @returns {string} the file path
 */
function fileExists( filePath ){
	try{ return fs.statSync(filePath).isFile(); }
	catch ( err ){return false;}
}
/**
 * Initialize the Express application.
 *
 * @method init
 * @returns {Object} the express application
 */

function init( config, rootPath ) {
	
	// Initialize express app
	var app = express();
	// Initialize Express middleware
	initMiddleware( app, config, rootPath );
	// Initialize Helmet security headers
	initHelmetHeaders( app );
	// Initialize CORS
	initCrossDomain( app );
	// Initialize config
	initGonfig( app, rootPath );
	// Initialize routes
	initRoutes( app, rootPath );
	// Initialize error routes
	initErrorRoutes( app, rootPath );
	return app;
}
module.exports.init = init;
//for tests
module.exports.overloadRenderFn = overloadRenderFn;
module.exports.rewriteAssetsRequestFn = rewriteAssetsRequestFn;
