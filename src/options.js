/**
 * options controller
 * @authors orochi114 (orochi114@126.com)
 * @date    2017-11-28 02:35:05
 * @version $Id$
 */

var $saveAs = document.getElementById('save_as'),
	$globalVolume = document.getElementById('global_volume');
$saveAs.onclick = function() {
	$saveAs.classList.toggle('active');
}
$globalVolume.onclick = function() {
	$globalVolume.classList.toggle('active');
}
