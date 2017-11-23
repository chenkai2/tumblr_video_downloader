var Tumblr = {
	ls: {
		get: function($key, $default) {
			if (typeof $default == "undefined") {
				$default = '';
			}
			var $value = $default;
			try {
				$value = JSON.parse(localStorage[$key]);
			} catch ($e) {
				Tumblr.ls.set($key, $value);
			}
			return $value;
		},
		set: function($key, $value) {
			localStorage[$key] = JSON.stringify($value);
		},
		remove: function($key) {
			localStorage.removeItem($key);
		}
	},
	setLink: function($srcLink) {
		//send message to background script
		chrome.runtime.sendMessage({
				"action": "setTumblrVideo",
				"link": $srcLink
			},
			function(response) {
				//console.log(response);
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
		$button.onclick = function() {
			$div.remove();
			mask(false);
		}
		document.body.appendChild($div);
	},
	onMessage: function($request, $sender, sendResponse) {
		//receive message from background script
		switch ($request.action) {
			case 'alert':
				var $msg = $request.msg;
				Tumblr.alert($msg);
				console.log($msg);
				sendResponse(true);
				break;
		}
	},
	onObserve: function($this) {
		if ($this.className && $this.className.match('vjs-control-bar')) {
			Tumblr.DownloadInjector($this);
			Tumblr.VolumeInjector($this);
		}
	},
	onLoad: function() {
		var $bars = document.getElementsByClassName('vjs-control-bar');
		for (var $i = $bars.length - 1; $i >= 0; $i--) {
			Tumblr.DownloadInjector($bars[$i]);
			Tumblr.VolumeInjector($bars[$i]);
		}
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
	Detector: function($e) {
		//console.log($e);
		Tumblr.setLink('');
		var $target = $e.target ? $e.target : $e.srcElement;
		var $realSrc = Tumblr.Analyse($target);
		Tumblr.setLink($realSrc);
	},
	DownloadInjector: function($bar) {
		var $realSrc = Tumblr.Analyse($bar);
		if (!$realSrc) return;
		var $downloadControl = document.createElement('div');
		$downloadControl.className = "vjs-download-control vjs-control vjs-button";
		$downloadControl.title = "Download";
		var $downloadIcon = document.createElement('div');
		$downloadIcon.className = "icon_download";
		$downloadIcon.onclick = function(ev) {
			//$downloadIcon.className = "icon_dotdotdot";
			chrome.runtime.sendMessage({
					"action": "addDownloadQueue",
					"link": $realSrc
				},
				function(response) {
					$downloadIcon.className = "icon_download";
				}
			);
		};
		$downloadControl.appendChild($downloadIcon);
		$bar.appendChild($downloadControl);
	},
	VolumeInjector: function($bar) {
		var $video = Tumblr.getVideo($bar);
		if (!$video) return;
		var $muteControls = $bar.getElementsByClassName('vjs-mute-control'),
			$muteControl = $muteControls.length > 0 ? $muteControls[0] : null;
		var $sliderControl = document.createElement("div"),
			$slider = document.createElement("input");
		$sliderControl.className = "vjs-video-volume hide";
		$slider.className = "vjs-volume-slider";
		$slider.type = "range";
		$slider.min = 0;
		$slider.max = 1;
		$slider.step = 0.01;
		$slider.style.zIndex = 10;
		var $volume = Tumblr.ls.get('volume', 0.4);
		$slider.volume = $volume;
		$video.volume = $slider.volume;
		$slider.addEventListener("input", function($ev) {
			$video.volume = $slider.value;
			Tumblr.ls.set('volume', $slider.value);
		});
		$video.addEventListener('volumechange', function($ev) {
			$slider.value = $video.volume;
			Tumblr.ls.set('volume', $slider.value);
		});
		$sliderControl.addEventListener('mouseenter', function($ev) {
			$sliderControl.className = $sliderControl.className.replace(/ hide\b/, '');
		});
		$sliderControl.addEventListener('mouseleave', function($ev) {
			$sliderControl.className = $sliderControl.className + ' hide';
		});
		var changeVolume = function($wheelDeltaY) {
			$delta = $wheelDeltaY > 0 ? 0.01 : -0.01;
			var $volume = $video.volume;
			if ($volume > 0.2) $delta *= 5;
			$volume = $volume + $delta;
			if ($volume < 0) {
				$volume = 0;
			} else if ($volume > 1) {
				$volume = 1;
			}
			$video.volume = $volume;
		};
		$sliderControl.addEventListener('wheel', function($ev) {
			//console.log($ev);
			$ev.preventDefault();
			changeVolume($ev.wheelDeltaY);
		});
		$sliderControl.appendChild($slider);
		if ($muteControl) {
			$muteControl.addEventListener('mouseenter', function($ev) {
				$sliderControl.className = $sliderControl.className.replace(/ hide\b/, '');
			});
			$muteControl.addEventListener('mouseleave', function($ev) {
				$sliderControl.className = $sliderControl.className + ' hide';
			});
			$muteControl.addEventListener('wheel', function($ev) {
				//console.log($ev);
				$ev.preventDefault();
				changeVolume($ev.wheelDeltaY);
			});
		}
		$bar.appendChild($sliderControl);
		$bar.parentNode.addEventListener('mouseenter', function($ev) {
			$video.volume = Tumblr.ls.get('volume', 0.4);
		});
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
document.oncontextmenu = Tumblr.Detector;
Tumblr.onLoad();
observer.observe(document.body, {
	childList: true,
	subtree: true
});
