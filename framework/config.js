"use strict";
var config = {};
config.environment = process.env.NODE_ENV || "dev";

// Upload files in memory
config.uploadFilesInMemory = process.env.UPLOAD_FILES_IN_MEMORY || false;

// Server settings
config.server = {
	host: process.env.SERVICE_ROUTER_HOST || "0.0.0.0",
	port: process.env.NODE_PORT || process.env.PORT || 3000
};

//set the default file extenstion
config.file_exts = config.environment === "dev" ? ".dev.html" : ".html";
// Export configuration object

//log entries
config.log_entries = process.env.LOGENTRIES_TOKEN || "";
config.log_entries_logset_name = process.env.LOGENTRIES_LOGSET_NAME || "";

//export module info
config.module_name = process.env.MODULE_NAME || "mc-nodejs-framework";
config.module_version = process.env.MODULE_VERSION || "V0";
config.docker_tag_name = config.module_name;
config.use_static_json = false;

module.exports = config;
