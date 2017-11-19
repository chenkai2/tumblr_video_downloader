var Tumblr = {
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
	Detector: function($e) {
		//console.log($e);
		Tumblr.setLink('');
		var $target = $e.target ? $e.target : $e.srcElement;
		if ('vjs-big-play-button' != $target.className) return;
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
		if (!$video) return;
		var $src = $video.poster;
		var $id = $src.replace(/^https?:\/\/.+\/tumblr_(.+)_[a-z0-9]+.jpg$/i, '$1').replace('/', '_');
		var $realSrc = "https://vtt.tumblr.com/tumblr_" + $id + ".mp4#_=_";
		console.log($realSrc);
		Tumblr.setLink($realSrc);
	}
}
chrome.runtime.onMessage.addListener(Tumblr.onMessage);
document.oncontextmenu = Tumblr.Detector;
