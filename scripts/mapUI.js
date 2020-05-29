"use strict";
// custom UI components for the main Maprover page
// mostly, this defines the interavtive buttons that are laid on top of the map

// TODO:
// [ ] add a CSS class to RHS control buttons so they can all be resized easily (in mutex_button constructor?)
// [ ] dynamically resize buttons depending on (i) initial viewport height or (ii) after resizing
// [ ] use FeatureGroup rather than LayerGroup for tiles?
// [ ] sizing of class 'cboxlab'

var map = L.map('map', {
    minZoom: 0,
    maxZoom: 19
    //}).setView([47.39365919797528, 38.91292367990341], 18);
    //}).setView([-36.30215075678218, 174.9156190124816], 12);
}).setView([-37.78333, 175.28333], 11);

var layer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 19,
    attribution: `Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>Powered by © <a href="https://www.agilebeat.com">Agilebeat Inc.</a>`,
    id: 'main_tiles',
    crossOrigin: true
});

var num_queries = 0;
// container for the currently displayed searches
// a simple key-value object with queryID as key and the tile layer as value
var selectionList = {};

function capitalize(x) {
    return x.split(' ')
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

// helper function that combines the selected features' geoJSON representations into a flat array
// used in the 'filterTweet' and 'download' controls
function flatten_geoJSON() {
    return {
        "type" : "FeatureCollection",
        // see https://stackoverflow.com/questions/5080028/what-is-the-most-efficient-way-to-concatenate-n-arrays
        "features": [].concat.apply([],Object.values(selectionList).map( val => val.toGeoJSON().features))
    };
}

// this is the data mapping the category names to their unique resources:
// bgURI: the (server-side) picture used to create a button
// color: the associated color used on the map and controls
// label: the text label used when displaying info about the category
// endpoint: the URL that the tile-classifying function should call when (points to an AWS API Gateway)
// consider if we want to have different textures for common things like landuse?
class map_category {
    constructor(picURI,label,endpoint) {
        this._uri = picURI;
        this._lab = label;
        this._endp = endpoint;
    }
    get pic() { return this._uri; }
    get label() { return this._lab; }
    get endpoint() { return this._endp; }
};

// colors for tiles associated with given categories
// https://colorbrewer2.org/#type=qualitative&scheme=Dark2&n=7
// since there will be more categories than can be assigned reasonably distinct colors,
// we'll hand out colors on the fly and cap the number of different categories that can be present
// simulaneously on the screen
const cat_colors = new Set(['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d']);

const categories = {
    rail: new map_category("images/railroad-icon.png",'Railroad','https://2w75f5k0i4.execute-api.us-east-1.amazonaws.com/prod/infer'),
    airfield: new map_category("images/jet-icon.png",'Airfield','https://8l5w4ajb98.execute-api.us-east-1.amazonaws.com/prod/infer'),
    // highway: new map_category("images/road-icon.png",'Motorway','https://www.abcxyz.com'),
    military: new map_category("images/military.png","Military", "https://ambv0h96lh.execute-api.us-east-1.amazonaws.com/prod/infer"),
    land_construction: new map_category('images/construction.png','Construction','https://b98zj24rw3.execute-api.us-east-1.amazonaws.com/prod/infer'),
    land_commerce: new map_category('images/commerce.png','Commerce','https://bn5maepxyj.execute-api.us-east-1.amazonaws.com/prod/infer'),
    land_industry: new map_category('images/industry.png','Industry','https://xhcd8q7pf5.execute-api.us-east-1.amazonaws.com/prod/infer')
};

// need to sync names so we can look up the palette color and set #id[data-tooltip]::before{background-color}
const mutex_button = function(bgURI,category_name,display_name,add_callback = null) {

    let addFunc = add_callback === null ? function(map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = `url(${bgURI})`;
        this.container.setAttribute('data-tooltip',display_name);
        this.container.id = `${category_name}_filter`;
        this.container.onclick = function() {
            button_mutex(this.id,'leaflet-bar leaflet-control mapctrl-active','leaflet-bar leaflet-control mapctrl');
        }
        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);
        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);
        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev) {
            L.DomEvent.stopPropagation(ev)
        });

        return this.container;
    } : add_callback;
    let rv = {
        onAdd: addFunc,
        getContainer: function () {
            return this.container;
        }
    }
    return L.Control.extend(rv);
}

// stamping out generic buttons (they all have the same behavior)
for(let [key, val] of Object.entries(categories)) {
    const button = mutex_button(val.pic,key,val.label);
    map.addControl(new button());
}


function getActiveButton() {
    for(let key of Object.keys(categories)) {
        let button = document.getElementById(`${key}_filter`);
        if(button.getAttribute('data-active') === 'active') return key;
    }
    return '';
}

const _mutex_group = Object.keys(categories).map(e => `${e}_filter`).concat('tweet_filter');

// mutex for the buttons that can toggle
// this should be added as a 'click' event callback for the buttons in the mutex group
const button_mutex = function(id,onclass,offclass) {
    const ix = _mutex_group.indexOf(id);
    if(ix >= 0) {
        _mutex_group.forEach((elem,i) => {
            let is_active = i === ix;
            let curr_class = document.getElementById(elem).className;
            if(is_active && curr_class === onclass) { // clicked on the currently active class - turn it back off
                document.getElementById(elem).className = offclass;
                document.getElementById(elem).setAttribute('data-active','inactive');    
            } else {
                document.getElementById(elem).className = is_active ? onclass : offclass;
                document.getElementById(elem).setAttribute('data-active',is_active ? 'active' : 'inactive');
            }
        });
    }
}

var TweetControl = L.Control.extend({

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/tweet-icon.png)";
        this.container.setAttribute('data-tooltip','Tweets');
        this.container.id = 'tweet_filter';

        this.container.onclick = function() {

            button_mutex(this.id,'leaflet-bar leaflet-control mapctrl-active','leaflet-bar leaflet-control mapctrl');

            if(this.getAttribute('data-active') === 'active') { return; }

            // need to do this and return if in inactive state?
            // map.removeLayer(this.filtered_tweets);

            let combineGeoJSON = {
                "type" : "FeatureCollection",
                "features": []
            };
            let xhr_eval = new XMLHttpRequest();
            xhr_eval.open('POST', 'https://2w75f5k0i4.execute-api.us-east-1.amazonaws.com/prod/tweet', true);
            xhr_eval.setRequestHeader('Content-Type', 'application/json');
            xhr_eval.onload = function () {
                let json_rsp = JSON.parse(xhr_eval.responseText);
                this.filtered_tweets = L.geoJSON(json_rsp)
                this.filtered_tweets.addTo(map);
            };
            xhr_eval.send(JSON.stringify(combineGeoJSON));
        }

        L.DomEvent.disableClickPropagation(this.container);
        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.on(this.container, 'contextmenu', function (ev) {
            L.DomEvent.stopPropagation(ev);
        });

        return this.container;
    }
});

var FilterTweetControl =  L.Control.extend({

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/filter-icon.png)";
        this.container.setAttribute('data-tooltip','Filter tweets');
        
        this.container.onclick = function() {

            if (Object.keys(selectionList).length > 0) {

                map.removeLayer(this.filtered_tweets);
                
                let combinedGeoJSON = flatten_geoJSON();
                
                let xhr_eval = new XMLHttpRequest();
                xhr_eval.open('POST', 'https://dq4deueez2.execute-api.us-east-1.amazonaws.com/prod/filter', true);
                xhr_eval.setRequestHeader('Content-Type', 'application/json');
                xhr_eval.onload = function () {
                    let json_rsp = JSON.parse(xhr_eval.responseText);
                    this.filtered_tweets = L.geoJSON(json_rsp)
                    this.filtered_tweets.addTo(map);
                };
                xhr_eval.send(JSON.stringify(combinedGeoJSON));
            }
        }

        L.DomEvent.disableClickPropagation(this.container);        
        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.on(this.container, 'contextmenu', function (ev) {
            L.DomEvent.stopPropagation(ev);
        });

        return this.container;
    }
});

var locationControl = L.Control.extend({

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/location-icon.png)";
        this.container.setAttribute('data-tooltip','Tour!');
        this.container.clickCounter = 0;
        this.container.onclick = function() {
            
            const locs = [
                [33.411522, 36.515558, 14], // Damaskus
                [36.184722, 37.215833, 13], // Al-Nayrab Military Airbase
                [33.918889, 36.866389, 13], // Al-Nasiriyah Military Airbase
                [34.568889, 36.572778, 13], // Al-Qusayr Military Airbase
                [35.732778, 37.101667, 13], // Abu al-Duhur Military Airbase
                [35.400833, 35.948611, 13], // bassel-al-assad good selection
                [47.393659, 38.912923, 14], // Mariupol/Rostov on the Black Sea
                [-37.78333, 175.28333, 11]  // Hamilton, NZ
            ];
            this.clickCounter++;
            this.clickCounter %= locs.length;
            const trip = locs[this.clickCounter];
            map.setView([trip[0],trip[1]],trip[2]);
        }

        L.DomEvent.disableClickPropagation(this.container);
        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.on(this.container, 'contextmenu', function (ev) {
            L.DomEvent.stopPropagation(ev);
        });

        return this.container;
    },
    getContainer: function () {
        return this.container;
    },
});

var docuGuide =  L.Control.extend({

    options: {
        position: 'bottomright'
    },

    onAdd: function () {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/help7.png)";
        this.container.setAttribute('data-tooltip','Open Help');
        this.container.onclick = function() { window.open("guide.html"); }
        L.DomEvent.disableClickPropagation(this.container);
        L.DomEvent.disableScrollPropagation(this.container);
        return this.container;
    }

});

var exportControl =  L.Control.extend({

    options: {
        position: 'bottomright'
    },

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/export.png)";
        this.container.setAttribute('data-tooltip','Export');

        this.container.onclick = function() {
            const options = {
                folder: 'maprover-selection',
                types: {
                    point: 'points',
                    polygon: 'polygons',
                    line: 'lines'
                }
            }
            if (Object.keys(selectionList).length > 0) {
                let combinedGeoJSON = flatten_geoJSON();
                shpwrite.download(combinedGeoJSON, options);
            } else {
                // notify wayward user that we can't export nothing!
                haveSnack("Nothing to export - make a selection first!");
            }
        }

        L.DomEvent.disableClickPropagation(this.container);
        L.DomEvent.disableScrollPropagation(this.container);
        L.DomEvent.on(this.container, 'contextmenu', function (ev) {
            L.DomEvent.stopPropagation(ev);
        });

        return this.container;
    }
});

map.addControl(new TweetControl());
// map.addControl(new FilterTweetControl());
map.addControl(new docuGuide());
map.addControl(new locationControl());
map.addControl(new exportControl());

layer.addTo(map); // by default, the controls have higher z-axis

var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

const drawing_options = {
    position: 'topleft',
    draw: {
        polygon: {
            allowIntersection: false,
            drawError: {
                color: '#ef8321', // Color the shape will turn when intersects
                message: "<strong>Error:<strong> boundary can't intersect itself!" // Message that will show when intersect
            }
        },
        // Turns off these drawing tools
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false
    },
    edit: {
        featureGroup: editableLayers,
        remove: false
    }
};

const drawControl = new L.Control.Draw(drawing_options);
map.addControl(drawControl);

class query_control {
    constructor(queryID,category,color,label) {
        this._id = queryID;
        this._category = category;
        this._color = color;
        // TODO: add a little globe or pin icon which the click method attaches to?
        const [chkID, spanID, buttonID] = [`${queryID}_toggle`,`${queryID}_pan`,`${queryID}_x`];
        const ctrlBar = L.control.custom({
            position: 'bottomleft',
            content : `<div class="panel-body-control">
                        <span class="cboxlab" id="${spanID}">${capitalize(label)}</span>
                        <div class="controlCheck">
                            <input type="checkbox" id="${chkID}" class="cbx hidden" checked>
                            <label for="${chkID}" class="lbl" style="background-color:${color}"></label>
                        </div>
                        <button class="dismiss" id="${buttonID}">Remove</button>
                       </div>`,
            classes: 'panel panel-default', // by default 'leaflet-control' also becomes one of the classes
            style: { // overriding the default Bootstrap styles
                // width: '200px',
                marginBottom: '16px',
                marginTop: '0px',
                padding: '0px'
            }
        });
        this._control = ctrlBar;
        this._control.addTo(map);
        // callbacks for the three elements
        let cbutton = document.getElementById(buttonID);
        let cspan = document.getElementById(spanID);
        let cbox = document.getElementById(chkID);
        const bounds = selectionList[queryID].getBounds();
        // useful: https://stackoverflow.com/questions/16845614/zoom-to-fit-all-markers-in-mapbox-or-leaflet
        cspan.addEventListener('click',() => {
            // its kind of dumb to pan to a hidden layer, so always restore it first:
            // console.debug(`Now the status of checkbox is: ${cbox.checked}`);
            if(!cbox.checked) {
                // simulate a click on the box:
                // let aclick = new Event('click');
                // console.debug(`Dispatching click to the box ${cbox.getAttribute('id')}`);
                // cbox.dispatchEvent(aclick);
                cbox.checked = true; // this restores the toggle but NOT the layer!
                console.debug(`Now the status of checkbox is: ${cbox.checked}`);
            }
            // map.panInsideBounds(bounds);
            map.fitBounds(bounds.pad(0.5));
        });

        // ensure the bg is dark enough that light text will contrast well
        // cbutton.style.setProperty('background-color',tinycolor(this._color).darken(25));
        // a horrible hack to dynamically set CSS pseudoclass property:
        // we cannot set the bg color style directly in the tag since that will override :hover
        // even when hovering!
        const hstring = `#${buttonID}:hover {background-color:${tinycolor(this._color).darken(10)};}
            #${buttonID}{background-color:${tinycolor(this._color).darken(25)};}`;
        const styleTag = document.createElement("style");
        styleTag.innerHTML = hstring;
        document.head.insertAdjacentElement('beforeend', styleTag);
        cbutton.addEventListener('click',() => this.destroy());
        
        cbox.addEventListener('change',() => {
            // let cbx = document.getElementById(chkID);
            // console.debug(`I was changed to ${cbox.checked}!`);
            cbox.checked ? this.restore() : this.hide();
        });
    }
    get category() { return this._category; }
    get color() { return this._color; }
    // remove tile layer from map but keep it in selection list
    hide() {
        // console.debug(`checking for ID ${selectionList[this._id]._leaflet_id}`);
        if(map.hasLayer(selectionList[this._id])) {
            map.removeLayer(selectionList[this._id]);
        }
    }
    // add a hidden layer back on to the map
    restore() {
        // console.debug(`checking for absence of ID ${selectionList[this._id]._leaflet_id}`);
        if(! map.hasLayer(selectionList[this._id])) {
            selectionList[this._id].addTo(map);
        }
    }
    destroy() {
        map.removeLayer(selectionList[this._id]);
        delete selectionList[this._id];
        // remove control div from map
        map.removeControl(this._control);
        delete queryControls[this._id];
        // also remove it from the document
        this._control.remove();
    }
}

// unique values of array (not necessarily preseving order!)
let unique = function(x) {
    return [...new Set(x)];
}

// let the control objects survive
const queryControls = {};

map.on(L.Draw.Event.CREATED, async function(e) {

    const zoom_lvl = Math.min(this.getZoom() + 5,19);

    // first check whether we've already saturated the available number of different layers:
    // TODO: guard against the case where two queries are launched at the same time, and both are
    // assigned the same color!
    let used_cats = new Set();
    for(const [key,val] of Object.entries(queryControls)) {
        used_cats.add(val.color);
    }
    const n_used = used_cats.size;
    if(n_used >= cat_colors.size) {
        // TODO: create a line break in the toast message
        haveSnack(`Max. of ${n_used} categories may be shown<br>Remove some first!`);
        return;
    }
    // an awkward and roundabout way to get a single value from this set...
    let avail_cols = new Set([...cat_colors].filter(e => !used_cats.has(e)));
    const itr = avail_cols.values();
    const layer_color = itr.next().value;
    // console.debug(`Using color: ${layer_color}`);
    // note that layer color doesn't actually get used unless the query returns something tangible

    
    // console.debug(`Layer bounds are: ${e.layer._bounds._northEast} and ${e.layer._bounds._southWest}`);
    if (e.layerType === 'polygon') {
        let endpoint, category, label;
        const active_category = getActiveButton();
        if(categories.hasOwnProperty(active_category)) {
            category = active_category;
            endpoint = categories[active_category].endpoint;
            label = categories[active_category].label;
        } else {
            haveSnack("No active category: polygon has no effect.");
            return;
        }
        num_queries++;
        const query_id = `query_${num_queries}`;
        let layerGroup = await tileAlgebra.bbox_coverage(
            endpoint,
            e.layer._bounds._northEast,
            e.layer._bounds._southWest,
            zoom_lvl,
            layer_color,
            query_id,
            e.layer.toGeoJSON()
        );
        if(layerGroup !== null && layerGroup.getLayers().length) {
            layerGroup.addTo(map);
            selectionList[query_id] = layerGroup; // tracking all the searches not cleared
            let QC = new query_control(query_id,category,layer_color,label);
            queryControls[query_id] = QC;
        }
    }
});
