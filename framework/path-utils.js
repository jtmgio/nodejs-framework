"use strict";
/**
 * Module dependencies.
 */
const _ = require("lodash");
const glob = require("glob");
/**
 * Get files by glob patterns
 */

function getGlobbedPaths(globPatterns, excludes) {
	var urlRegex, output, files;
	// URL paths regex
	urlRegex = new RegExp("^(?:[a-z]+:)?\/\/", "i");
	// The output array
	output = [];
	// If glob pattern is array so we use each pattern in a recursive way, otherwise we use glob
	if (_.isArray(globPatterns)) {
		globPatterns.forEach(function(globPattern) {
			output = _.union(output, getGlobbedPaths(globPattern, excludes));
		});
	} else if (_.isString(globPatterns)) {
		if (urlRegex.test(globPatterns)) {
			output.push(globPatterns);
		} else {
			files = glob.sync(globPatterns);
			if (excludes) {
				files = files.map(function(file) {
					var i;
					if (_.isArray(excludes)) {
						for (i in excludes) {
							file = file.replace(excludes[i], "");
						}
					} else {
						file = file.replace(excludes, "");
					}
					return file;
				});
			}
			output = _.union(output, files);
		}
	}
	return output;
}
exports.getGlobbedPaths = getGlobbedPaths;
