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
	DOWNLOADING_RETRY_TIMES = 10,
	i18n = function($var, $options) {
		return chrome.i18n.getMessage($var, $options);
	};
var Tumblr = {
	options: {
		saveAs: true,
		globalVolume: true
	},
	onInstalled: function() {},
	onLoad: function() {
		options.get({
			'saveAs': Tumblr.options.saveAs,
			'globalVolume': Tumblr.options.globalVolume
		}, function($options) {
			for (var $i in $options) {
				Tumblr.options[$i] = $options[$i];
			}
			//console.log('onload', Tumblr.options);
			// When the background gets started, set up the context menus
			var $menuCreated = chrome.contextMenus.create({
				id: MENU_ID,
				title: i18n("menu_download"),
				documentUrlPatterns: ["*://*.tumblr.com/*"],
				contexts: [
					"all"
				]
			});
		});
	},
	onMessage: function($request, $sender, $sendResponse) {
		switch ($request.action) {
			case 'setTumblrVideo':
				ls.set(LINK, $request.link);
				$sendResponse(true);
				break;
			case 'addDownloadQueue':
				Tumblr.addDownloadQueue($request.link, Tumblr.options.saveAs);
				$sendResponse(true);
				break;
		}
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
	onDownloadStateChange: function($delta, $error) {
		console.log(`onchange`, $delta);
		if (!Tumblr.inDownloadQueue($delta.id)) return;
		if ($delta.error && $delta.error.current) {
			if ($delta.error.current.match(/^NETWORK_/)) {
				console.log('network error');
				Tumblr.retryDownload($delta.id);
				return;
			} else if ($delta.error.current.match(/^USER_/)) {
				//user cancel, user shutdown
				console.log('user abort');
				Tumblr.removeDownloadQueue($delta.id);
				return;
			}
		}
		if (!$delta.state) return;
		switch ($delta.state.current) {
			case 'complete':
				Tumblr.removeDownloadQueue($delta.id);
				break;
			case 'interrupted':
				console.log('interrupted', $delta);
				if ($delta.canResume && $delta.canResume.current) {
					//wait for next change event to retry
				} else {
					//can't resume(e.g. manually abort), clear stage.
					console.log(`${$delta.id}: can not resume. clear stage.`);
					//Tumblr.removeDownloadQueue($delta.id);
				}
				break;
			case 'in_progress':
				break;
			default:
				console.log(`unknown download state: ${$delta.state.current}`);
		}
	},
	addDownloadQueue: function($link, $saveAs) {
		chrome.downloads.download({
			url: $link,
			'saveAs': $saveAs
		}, function($id) {
			if (chrome.runtime.lastError) {
				console.log(`downloading: ${chrome.runtime.lastError.message}`);
			}
			if (!$id) return;
			var $ids = ls.get(DOWNLOADING_IDS, []);
			if ($ids.indexOf($id) >= 0) return;
			$ids.push($id);
			ls.set(DOWNLOADING_IDS, $ids);
		});
	},
	removeDownloadQueue: function($id) {
		var $ids = ls.get(DOWNLOADING_IDS, []),
			$idx = $ids.indexOf($id),
			$key = DOWNLOADING_RETRY + $id;
		if ($idx < 0) return;
		$ids.splice($idx, 1);
		ls.set(DOWNLOADING_IDS, $ids);
		ls.remove($key);
	},
	inDownloadQueue: function($id) {
		var $ids = ls.get(DOWNLOADING_IDS, []),
			$idx = $ids.indexOf($id);
		return $idx >= 0;
	},
	retryDownload: function($id) {
		var $key = DOWNLOADING_RETRY + $id;
		//can resume, retry
		var $retry = ls.get($key, 0);
		if ($retry < DOWNLOADING_RETRY_TIMES) {
			chrome.downloads.resume($id, function() {
				if (chrome.runtime.lastError) {
					console.log('try to resume:', chrome.runtime.lastError, chrome.runtime.lastError.message);
					if ('Download canceled.' == chrome.runtime.lastError.message) {
						Tumblr.removeDownloadQueue($id);
						return;
					}
					if (chrome.runtime.lastError.message.match(/Download \d+ cannot be resumed/)) {
						setTimeout(function() {
							console.log(`Download ${$id}: retry by setTimeout`);
							Tumblr.retryDownload($id);
						}, 2000);
					}
				}
				console.log(`Download ${$id}: retry time: ${$retry}`);
				$retry++;
				ls.set($key, $retry);
			});
		} else {
			console.log(`Download ${$id}: retry time exceeded.`);
			Tumblr.removeDownloadQueue($id);
		}
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
//ff comaptiable
chrome.extension.onMessage ? chrome.extension.onMessage.addListener(Tumblr.onMessage) :
	chrome.runtime.onMessage.addListener(Tumblr.onMessage);
chrome.downloads.onChanged.addListener(Tumblr.onDownloadStateChange);
