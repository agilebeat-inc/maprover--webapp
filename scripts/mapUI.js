// custom UI components for the main Maprover page
// mostly, this defines the interavtive buttons that are laid on top of the map

// TODO list
// [ ] when the screen height is small, the top-right and bottom-right buttons overlap each other

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
    attribution: `Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>Powerd by © <a href="https://www.agilebeat.com">Agilebeat Inc.</a>`,
    id: 'examples.map-i875mjb7',
    crossOrigin: true
});

// locations where tweet tags are placed
var selectionList = [];

// helper function that combines the selected features' geoJSON representations into a flat array
// used in the 'filterTweet' and 'download' controls
function flatten_geoJSON() {
    if(selectionList.length === 0) return [];
    return {
        "type" : "FeatureCollection",
        // see https://stackoverflow.com/questions/5080028/what-is-the-most-efficient-way-to-concatenate-n-arrays
        "features": [].concat.apply([],selectionList.map( item => item.toGeoJSON().features))
    };
}

category_button = function(options) {
    _container = null;
    const usr_keys = options.keys();
    let getif = function(k){ return k in usr_keys ? options[k] : null}
    on_add = function(map) {
        _container = L.DomUtil.create('div','');
    }
}

var RailControl =  L.Control.extend({

    container: null,
    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/railroad-icon.png)";
        this.container.setAttribute('data-tooltip','Railroads');
        this.container.id = 'railroad_filter';
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
    },
    getContainer: function () {
        return this.container;
    }
});

var AirfieldControl =  L.Control.extend({

    container: null,
    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/jet-icon.png)";
        this.container.setAttribute('data-tooltip','Airfields');
        this.container.id = 'airfield_filter';
        this.container.onclick = function() {
            button_mutex(this.id,'leaflet-bar leaflet-control mapctrl-active','leaflet-bar leaflet-control mapctrl');
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
    }
});

var TweetControl =  L.Control.extend({

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/tweet-icon.png)";
        this.container.setAttribute('data-tooltip','Tweets');
        this.container.id = 'tweet_filter';

        this.container.onclick = function(){

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

var locationControl =  L.Control.extend({

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
                [47.39365919797528, 38.91292367990341, 14], // Mariupol/Rostov on the Black Sea
                [-37.78333, 175.28333, 11] // Hamilton, NZ
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

var FilterTweetControl =  L.Control.extend({

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control mapctrl');
        this.container.style.backgroundImage = "url(images/filter-icon.png)";
        this.container.setAttribute('data-tooltip','Filter tweets');
        
        this.container.onclick = function() {

            if (selectionList.length > 0) {

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
            if (selectionList.length > 0) {
                let combinedGeoJSON = flatten_geoJSON();
                shpwrite.download(combinedGeoJSON, options);
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

let rail_control = new RailControl();
let airfield_control = new AirfieldControl();
let export_control = new exportControl();

map.addControl(rail_control);
map.addControl(airfield_control);
map.addControl(new TweetControl());
map.addControl(new FilterTweetControl());
map.addControl(new docuGuide());
map.addControl(new locationControl());
map.addControl(export_control);

layer.addTo(map); // by default, the controls have higher z-axis

const _mutex_group = ['railroad_filter','airfield_filter','tweet_filter'];

// mutex for the buttons that can toggle
// this should be added as a 'click' event callback for the buttons in the mutex group
button_mutex = function(id,onclass,offclass) {
    let ix = _mutex_group.indexOf(id);
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

map.on(L.Draw.Event.CREATED, async function(e) {

    // idea: create a temporary pane for each search
    // so that tiles can be populated to the pane immediately upon validation
    // then, once the whole search is complete we can delete that pane and re-add
    // the whole result set to the default pane ('overlayPane')
    // https://leafletjs.com/reference-1.6.0.html#layer
    // console.log("now an event was created!");
    

    const zoom_lvl = Math.min(this.getZoom() + 5,19);
    // console.log(`The zoom in use is ${zoom_lvl}`);
    // console.log(`Layer bounds are: ${e.layer._bounds._northEast} and ${e.layer._bounds._southWest}`);
    let endpoint, category = '';
    // needs refactoring to generalize to different types of tiles
    if (e.layerType === 'polygon') {
        if (rail_control.getContainer().getAttribute('data-active') === 'active') {
            console.log(`Searching for rail tiles!`);
            category = 'rail';
            endpoint = 'https://2w75f5k0i4.execute-api.us-east-1.amazonaws.com/prod/infer';
        } else if (airfield_control.getContainer().getAttribute('data-active') === 'active') {
            console.log(`Searching for airfield tiles!`);
            category = 'airfield';
            endpoint = 'https://8l5w4ajb98.execute-api.us-east-1.amazonaws.com/prod/infer';
        } else {
            console.warn(`No button active; polygon has no effect.`);
            return;
        }
        
        
        let layerGroup = await tileAlgebra.bbox_coverage(
            endpoint,
            category,
            e.layer._bounds._northEast,
            e.layer._bounds._southWest,
            zoom_lvl,
            e.layer.toGeoJSON()
        );
        selectionList.push(layerGroup); // tracking all the searches not cleared
    }
});
