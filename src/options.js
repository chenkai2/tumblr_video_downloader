/**
 * options controller
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28 02:35:05
 * @version $Id$
 */
//i18n
document.body.innerHTML = document.body.innerHTML
    .replace(/{__MSG_(.+)__}/g, function($match, $p1, $offset, $string) {
        //console.log($match, $p1);
        return chrome.i18n.getMessage($p1);
    });
var $setting = document.getElementById('setting'),
    $saveAs = document.getElementById('save_as'),
    $globalVolume = document.getElementById('global_volume');
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
