/**
 * options controller
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28 02:35:05
 * @version $Id$
 */

var $setting = document.getElementById('setting'),
	$saveAs = document.getElementById('save_as'),
	$globalVolume = document.getElementById('global_volume'),
	i18n = chrome.i18n.getMessage;
$saveAs.addEventListener('click', function() {
	$saveAs.classList.toggle('active');
	var $saveAsFlag = $saveAs.classList.contains('active');
	options.set({
		'saveAs': $saveAsFlag
	});
});
$globalVolume.addEventListener('click', function() {
	$globalVolume.classList.toggle('active');
	var $globalVolumeFlag = $globalVolume.classList.contains('active');
	options.set({
		'globalVolume': $globalVolumeFlag
	});
});
//i18n
$setting.innerHTML = i18n('options_setting');
$saveAs.title = i18n('options_save_as_title');
$saveAs.getElementsByTagName('span')[0].innerText = i18n('options_save_as_label');
$globalVolume.title = i18n('options_global_volume_title');
$globalVolume.getElementsByTagName('span')[0].innerText = i18n('options_global_volume_label');
//init setting
options.get({
	'saveAs': true
}, function($i) {
	var $saveAsFlag = $i.saveAs;
	if ($saveAsFlag) {
		$saveAs.classList.add('active');
	}
});
options.get({
	'globalVolume': true
}, function($i) {
	var $globalVolumeFlag = $i.globalVolume;
	if ($globalVolumeFlag) {
		$globalVolume.classList.add('active');
	}
});