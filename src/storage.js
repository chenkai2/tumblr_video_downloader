/**
 * storage
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28
 * @version $Id$
 */

var ls = {
	get: function($key, $default) {
		if (typeof $default == "undefined") {
			$default = '';
		}
		var $value = $default;
		try {
			$value = JSON.parse(localStorage[$key]);
		} catch ($e) {
			ls.set($key, $value);
		}
		return $value;
	},
	set: function($key, $value) {
		return localStorage[$key] = JSON.stringify($value);
	},
	remove: function($key) {
		return localStorage.removeItem($key);
	},
	clear: function() {
		return localStorage.clear();
	}
}
var options = chrome.storage.local;