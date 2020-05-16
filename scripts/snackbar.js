"use strict";

// a simple 'snackbar' inspired by
// https://www.w3schools.com/howto/howto_js_snackbar.asp
// to display notifications, in particular when a map search
// does not match any tiles, we display a temporary notification
// instead of just doing nothing
function haveSnack(text,bgcolor = "#AE3D0D",showClass = 'snackbar',duration = 3000) {
    let toast = document.createElement('div');
    toast.className = showClass;
    toast.innerText = text;
    // may need to generate a unique ID if its possible to have multiple popups within the time window
    toast.id = 'zeronotify';
    toast.style.backgroundColor = bgcolor;
    toast.style.zIndex = 800;
    // it looks a little glitchy if we add visible element then trigger animation
    // so it's not visible when added
    document.getElementById('map').appendChild(toast);
    // now apply CSS animation:
    document.getElementById('zeronotify').className = 'snackbar snackbar-show';
    setTimeout(function(){ toast.remove(); }, duration);
}
