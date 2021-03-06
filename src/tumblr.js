/**
 * action script
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28 02:35:05
 * @version $Id$
 */
var EVENTS = {
		onCompleted: [],
		onStarted: [],
		onAborted: []
	},
	EVENT_SEQ = 1,
	DOWNLOAD_STATUSES = [],
	STATUS_INIT = 0,
	STATUS_DOWNLOADING = 1,
	STATUS_ABORTED = 2,
	STATUS_COMPLETED = 3;
var Tumblr = {
	options: {
		saveAs: true,
		globalVolume: true
	},
	setLink: function($srcLink) {
		//send message to background script
		chrome.runtime.sendMessage({
				"action": "setTumblrVideo",
				"link": $srcLink
			},
			function($response) {
				//console.log($response);
			}
		);
	},
	alert: function($msg) {
		var mask = function($show) {
			var $display = $show ? 'block' : 'none',
				$className = $show ? 'ui_dialog_lock opaque' : 'ui_dialog_lock',
				$masks = document.getElementsByClassName('ui_dialog_lock');
			if ($masks.length == 0) return;
			var $mask = $masks[0];
			$mask.className = $className;
			$mask.style = 'display:' + $display;
		}
		mask(true);
		var $template = '<div class="ui_dialog alert fade-in-up"> <span class="text">${msg}</span> <div class="buttons"><div class="tab_frame focus init_focus"><button class="ui_button btn_0 chrome blue" data-btn-id="0"><span>${OK}</span></button></div></div></div>';
		var $div = document.createElement('div');
		$div.id = 'dialog_tumblr_downloader';
		$div.className = 'ui_dialog_pos';
		$div.innerHTML = $template.replace('${OK}', chrome.i18n.getMessage('OK')).replace('${msg}', $msg);
		var $buttons = $div.getElementsByTagName('button'),
			$button = $buttons[0];
		$button.addEventListener('click', function() {
			$div.remove();
			mask(false);
		});
		document.body.appendChild($div);
	},
	onOptionsChanged: function($changes, $namespace) {
		for (var $i in $changes) {
			var $change = $changes[$i];
			Tumblr.options[$i] = $change.newValue;
		}
		//console.log(Tumblr.options, $namespace);
	},
	onMessage: function($request, $sender, $sendResponse) {
		//receive message from background script
		switch ($request.action) {
			case 'alert':
				var $msg = $request.msg;
				Tumblr.alert($msg);
				console.log($msg);
				$sendResponse(true);
				break;
			case 'start':
				//download start actions here
				$event = EVENTS.onStarted[$request.id];
				$event();
				break;
			case 'abort':
				//download abort actions here
				$event = EVENTS.onAborted[$request.id];
				$event();
				break;
			case 'complete':
				//download complete actions here
				$event = EVENTS.onCompleted[$request.id];
				$event();
				break;

		}
	},
	onObserve: function($this) {
		if ($this.classList) {
			if ($this.classList.contains('vjs-control-bar')) {
				Tumblr.DownloadInjector($this);
				Tumblr.PlayerInjector($this);
			} else if ($this.classList.contains('post_container') || $this.classList.contains('post')) {
				Tumblr.TimestampInjector($this);
			}
		}
	},
	onLoad: function() {
		//read options first
		options.get({
			'saveAs': Tumblr.options.saveAs,
			'globalVolume': Tumblr.options.globalVolume
		}, function($options) {
			Tumblr.options = $options;
			//console.log(Tumblr.options);
			//injector
			var $bars = document.getElementsByClassName('vjs-control-bar');
			for (var $i = 0; $i < $bars.length; $i++) {
				Tumblr.DownloadInjector($bars[$i]);
				Tumblr.PlayerInjector($bars[$i]);
			}
			//timestamp injector
			var $posts = document.getElementsByClassName('post');
			for (var $i = 0; $i < $posts.length; $i++) {
				Tumblr.TimestampInjector($posts[$i]);
			}
		});
	},
	getVideo: function($target) {
		var $parent = $target.parentNode,
			$siblings = $parent.childNodes,
			$video = null;
		for (var i = 0; i < $siblings.length; i++) {
			var $sibling = $siblings[i];
			//console.log($sibling);
			if ('VIDEO' == $sibling.nodeName) {
				$video = $sibling;
				break;
			}
		}
		return $video;
	},
	Analyse: function($target) {
		var $video = Tumblr.getVideo($target);
		if (!$video) return;
		var $src = $video.poster,
			$longSrc = $video.src;
		var $id = $src.replace(/^https?:\/\/.+\/tumblr_(.+)_[a-z0-9]+.jpg$/i, '$1');
		var $realSrc = $id ? ("https://vtt.tumblr.com/tumblr_" + $id + ".mp4#_=_") : $longSrc;
		//console.log($realSrc);
		return $realSrc;
	},
	Detector: function($event) {
		//console.log($event);
		Tumblr.setLink('');
		var $target = $event.target ? $event.target : $event.srcElement;
		var $realSrc = Tumblr.Analyse($target);
		Tumblr.setLink($realSrc);
	},
	DownloadInjector: function($bar) {
		var $controls = $bar.getElementsByClassName('vjs-download-control');
		if ($controls.length > 0) return;
		var $realSrc = Tumblr.Analyse($bar);
		if (!$realSrc) return;
		var $downloadControl = document.createElement('div');
		$downloadControl.className = "vjs-download-control vjs-control vjs-button";
		$downloadControl.title = "Download";
		var $downloadIcon = document.createElement('div');
		$downloadIcon.className = "icon_download";
		$downloadIcon.addEventListener('click', function($ev) {
			$downloadIcon.className = 'icon_dotdotdot';
			$event_seq = EVENT_SEQ;
			chrome.runtime.sendMessage({
					"action": "addDownloadQueue",
					"link": $realSrc,
					"id": $event_seq
				},
				function($response) {}
			);
			DOWNLOAD_STATUSES[$event_seq] = STATUS_INIT;
			EVENTS.onStarted[$event_seq] = function() {
				$downloadIcon.className = 'icon_checkmark';
				DOWNLOAD_STATUSES[$event_seq] = STATUS_DOWNLOADING;
				setTimeout(function() {
					var $status = DOWNLOAD_STATUSES[$event_seq],
						$className = STATUS_COMPLETED == $status || STATUS_ABORTED == $status ? 'icon_download' : 'icon_dotdotdot';
					$downloadIcon.className = $className;
				}, 2000);
			}
			EVENTS.onAborted[$event_seq] = function() {
				$downloadIcon.className = 'icon_close';
				DOWNLOAD_STATUSES[$event_seq] = STATUS_ABORTED;
				setTimeout(function() {
					$downloadIcon.className = 'icon_download';
				}, 2000);
			}
			EVENTS.onCompleted[$event_seq] = function() {
				$downloadIcon.className = 'icon_download';
				DOWNLOAD_STATUSES[$event_seq] = STATUS_COMPLETED;
			}
			EVENT_SEQ++;
		});
		$downloadControl.appendChild($downloadIcon);
		$bar.appendChild($downloadControl);
	},
	PlayerInjector: function($bar) {
		var $controls = $bar.getElementsByClassName('vjs-video-volume');
		if ($controls.length > 0) return;
		var $video = Tumblr.getVideo($bar);
		if (!$video) return;
		var $muteControls = $bar.getElementsByClassName('vjs-mute-control'),
			$muteControl = $muteControls.length > 0 ? $muteControls[0] : null;
		var $progressControls = $bar.getElementsByClassName('vjs-progress-control'),
			$progressControl = $progressControls.length > 0 ? $progressControls[0] : null;
		var $sliderControl = document.createElement("div"),
			$slider = document.createElement("input");
		var $parent = $bar.parentNode;
		$sliderControl.className = "vjs-video-volume invisible";
		$slider.className = "vjs-volume-slider";
		$slider.type = "range";
		$slider.title = "Wheel Scroll to control";
		$slider.min = 0;
		$slider.max = 1;
		$slider.step = 0.01;
		$slider.style.zIndex = 10;
		var $volume = ls.get('volume', 0.4);
		if (Tumblr.options.globalVolume) {
			$video.volume = $volume;
		}
		$slider.volume = $video.volume;
		$slider.addEventListener("input", function($event) {
			$video.volume = $slider.value;
			ls.set('volume', $slider.value);
		});
		$video.addEventListener('volumechange', function($event) {
			$slider.value = $video.volume;
			ls.set('volume', $slider.value);
		});
		var $toggle = function($event) {
			$sliderControl.classList.toggle('invisible');
		}
		$sliderControl.addEventListener('mouseenter', $toggle);
		$sliderControl.addEventListener('mouseleave', $toggle);
		var $changeVolume = function($event) {
			//console.log($event);
			$event.preventDefault();
			$delta = $event.deltaY > 0 ? -0.01 : 0.01;
			var $volume = $video.volume;
			if ($volume > 0.2) $delta *= 5;
			$volume += $delta;
			if ($volume < 0) {
				$volume = 0;
			} else if ($volume > 1) {
				$volume = 1;
			}
			if ($video.muted) {
				$video.muted = false;
			}
			$video.volume = $volume;
		};
		var $changeProgress = function($event) {
			//console.log($event);
			if (!$video.duration) {
				return;
			}
			$event.preventDefault();
			$delta = $event.deltaY > 0 ? 1 : -1;
			var $currentTime = $video.currentTime;
			$currentTime += $delta;
			if ($currentTime < 0) {
				$currentTime = 0;
			} else if ($currentTime > $video.duration) {
				$currentTime -= $delta;
			}
			var $a = setTimeout(function() {
				clearTimeout($a);
				$parent.classList.remove('vjs-user-inactive');
				$parent.classList.add('vjs-user-active');
			}, 250);
			$video.currentTime = $currentTime;
		};
		$sliderControl.addEventListener('wheel', $changeVolume);
		$sliderControl.appendChild($slider);
		if ($muteControl) {
			$muteControl.addEventListener('mouseenter', $toggle);
			$muteControl.addEventListener('mouseleave', $toggle);
			$muteControl.addEventListener('wheel', $changeVolume);
		}
		if ($progressControl) {
			$progressControl.addEventListener('wheel', $changeProgress);
		}
		$bar.appendChild($sliderControl);
		$parent.addEventListener('mouseenter', function($event) {
			if (Tumblr.options.globalVolume) {
				$video.volume = ls.get('volume', 0.4);
			}
		});
	},
	TimestampInjector: function($post) {
		var $permaLinks = $post.getElementsByClassName('post_permalink');
		if ($permaLinks.length == 0) return;
		var $permaLink = $permaLinks[0];
		var $title = $permaLink.title.replace(/.+ - (.+)$/, '$1');;
		var $postHeaders = $post.getElementsByClassName('post_header');
		if ($postHeaders.length == 0) return;
		var $postHeader = $postHeaders[0];
		var $spans = $postHeader.getElementsByClassName('td-timestamp'),
			$span;
		if ($spans.length == 0) {
			$span = document.createElement('span');
			$span.className = 'td-timestamp';
			$postHeader.appendChild($span);
		} else {
			$span = $spans[0];
		}
		$span.innerText = $title;
	}
}
var observer = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
		for (var i = 0; i < mutation.addedNodes.length; i++) {
			Tumblr.onObserve(mutation.addedNodes[i]);
		}
	})
});
chrome.runtime.onMessage.addListener(Tumblr.onMessage);
chrome.storage.onChanged.addListener(Tumblr.onOptionsChanged);
document.addEventListener('contextmenu', Tumblr.Detector);
Tumblr.onLoad();
observer.observe(document.body, {
	childList: true,
	subtree: true
});