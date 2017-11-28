/**
 * background service
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28 02:35:05
 * @version $Id$
 */

var MENU_ID = 'tumblr downloader',
	LINK = 'link',
	DOWNLOADING_IDS = 'downloading_ids',
	DOWNLOADING_RETRY = 'downloading_retry_',
	i18n = function($var, $options) {
		return chrome.i18n.getMessage($var, $options);
	};
var Tumblr = {
	options: {
		saveAs: true,
		globalVolume: true
	},
	onInstalled: function() {
		// When the app gets installed, set up the context menus
		var $menuCreated = chrome.contextMenus.create({
			id: MENU_ID,
			title: i18n("menu_download"),
			documentUrlPatterns: ["http://*.tumblr.com/*", "https://*.tumblr.com/*"],
			contexts: [
				"page",
				"link",
				"image",
				"video",
				"audio"
			]
		});
	},
	onLoad: function() {
		options.get({
			'saveAs': Tumblr.options.saveAs,
			'globalVolume': Tumblr.options.globalVolume
		}, function($options) {
			Tumblr.options = $options;
			console.log(Tumblr.options);
		});
	},
	onClicked: function($itemData) {
		if ($itemData.menuItemId == MENU_ID) {
			var $link = ls.get(LINK);
			if (!$link) {
				Tumblr.alert(i18n('error_no_video_detected'));
				return;
			}
			Tumblr.addDownloadQueue($link, Tumblr.options.saveAs);
		}
	},
	onOptionsChanged: function($changes, $namespace) {
		for (var $i in $changes) {
			var $change = $changes[$i];
			Tumblr.options[$i] = $change.newValue;
		}
		//console.log(Tumblr.options, $namespace);
	},
	onDownloadStateChange: function(delta) {
		if (!delta.state) return;
		var $ids = ls.get(DOWNLOADING_IDS, []);
		var $idx = $ids.indexOf(delta.id);
		switch (delta.state.current) {
			case 'complete':
				if ($idx >= 0) {
					$ids.splice($idx, 1);
					ls.set(DOWNLOADING_IDS, $ids);
					ls.remove(DOWNLOADING_RETRY + delta.id);
				}
				break;
			case 'interrupted':
				if ($idx >= 0) {
					var $key = DOWNLOADING_RETRY + delta.id;
					if (delta.canResume) {
						//can resume, retry
						var $retry = ls.get($key, 0);
						if ($retry < 10) {
							chrome.downloads.resume(delta.id, function() {
								console.log(delta.id + ':retry time: ' + $retry);
							});
							$retry++;
							ls.set($key, $retry);
						};
					} else {
						//can't resume(e.g. manually abort), clear stage.
						$ids.splice($idx, 1);
						ls.set(DOWNLOADING_IDS, $ids);
						ls.remove($key);
					}

				}
				break;
			case 'in_progress':
				break;
			default:
				console.log('unknown download state: ' + delta.state.current);
		}
	},
	onMessage: function($request, $sender, sendResponse) {
		switch ($request.action) {
			case 'setTumblrVideo':
				ls.set(LINK, $request.link);
				sendResponse(true);
				break;
			case 'addDownloadQueue':
				Tumblr.addDownloadQueue($request.link, Tumblr.options.saveAs);
				sendResponse(true);
				break;
		}
	},
	addDownloadQueue: function($link, $saveAs) {
		chrome.downloads.download({
			url: $link,
			'saveAs': $saveAs
		}, function($id) {
			var $ids = ls.get(DOWNLOADING_IDS, []);
			if ($ids.indexOf($id) >= 0) return;
			$ids.push($id);
			ls.set(DOWNLOADING_IDS, $ids);
		});
	},
	sendMessage: function($msg) {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, function($tabs) {
			//console.log($tabs);
			chrome.tabs.sendMessage($tabs[0].id, $msg, {
					frameId: 0
				},
				function($response) {
					//console.log($response);
				});
		});
	},
	alert: function($msg) {
		Tumblr.sendMessage({
			action: "alert",
			msg: $msg
		});
	}
};

Tumblr.onLoad();
chrome.runtime.onInstalled.addListener(Tumblr.onInstalled);
chrome.storage.onChanged.addListener(Tumblr.onOptionsChanged);
chrome.contextMenus.onClicked.addListener(Tumblr.onClicked);
chrome.extension.onMessage.addListener(Tumblr.onMessage);
chrome.downloads.onChanged.addListener(Tumblr.onDownloadStateChange);