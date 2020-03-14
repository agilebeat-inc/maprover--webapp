var map = L.map('map', {
    minZoom: 0,
    maxZoom: 19
//}).setView([47.39365919797528, 38.91292367990341], 18);
//}).setView([-36.30215075678218, 174.9156190124816], 12);
}).setView([-37.78333, 175.28333], 11);
var layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox </a>' +
        'Powerd by © <a href="https://www.agilebeat.com">Agilebeat Inc. </a>',
    id: 'examples.map-i875mjb7',
    crossOrigin: true
});

// this needs a refactor - create a simple CSS class for the map controls
var RailControl =  L.Control.extend({
    options: {
        position: 'topright'
    },
    container: null,
    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/railroad-icon.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';
        let container = this.container;
        this.container.onclick = function() {
            if (container.style.width == '55px') {
                container.style.backgroundSize = "45px 45px";
                container.style.width = '45px';
                container.style.height = '45px';
            } else {
                container.style.backgroundSize = "55px 55px";
                container.style.width = '55px';
                container.style.height = '55px';
            }
        }
        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        // what is this???
        for (var event in this.options.events) {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;
    },
    getContainer: function () {
        return this.container;
    },
});

var AirfieldControl =  L.Control.extend({
    options: {
        position: 'topright'
    },
    container: null,
    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/jet-icon.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';
        let container = this.container;
        this.container.onclick = function() {
            if (container.style.width == '55px') {
                container.style.backgroundSize = "45px 45px";
                container.style.width = '45px';
                container.style.height = '45px';
            } else {
                container.style.backgroundSize = "55px 55px";
                container.style.width = '55px';
                container.style.height = '55px';
            }
        }
        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        for (var event in this.options.events)
        {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;
    },
    getContainer: function () {
        return this.container;
    },
});

var locationControl =  L.Control.extend({

    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/location-icon.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';
        this.container.clickCounter = 0;
        this.container.onclick = function() {
            this.clickCounter++;
            if (this.clickCounter === 1)
                map.setView([33.411522, 36.515558], 14); // Damaskus
            else if (this.clickCounter === 2)
                map.setView([36.184722, 37.215833], 13);//Al-Nayrab Military Airbase
            else if (this.clickCounter === 3)
                map.setView([33.918889, 36.866389], 13); //Al-Nasiriyah Military Airbase
            else if (this.clickCounter === 4)
                map.setView([34.568889, 36.572778], 13); //Al-Qusayr Military Airbase
            else if (this.clickCounter === 5)
                map.setView([35.732778, 37.101667], 13); // Abu al-Duhur Military Airbase
            else if (this.clickCounter === 6)
                map.setView([35.400833,35.948611], 13); // bassel-al-assad good selection
            else if (this.clickCounter === 7)
                map.setView([-37.78333, 175.28333], 11);
            else if (this.clickCounter === 8)
                map.setView([47.39365919797528, 38.91292367990341], 14); // Russia
            if (this.clickCounter === 9)
                this.clickCounter = 0;
        }
        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        for (var event in this.options.events)
        {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;
    },
    getContainer: function () {
        return this.container;
    },
});

var TweetControl =  L.Control.extend({

    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/tweet-icon.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';

        this.container.onclick = function(){
            let container = this;
            if (this.style.width == '55px') {
                this.style.backgroundSize = "45px 45px";
                this.style.width = '45px';
                this.style.height = '45px';
                map.removeLayer(this.filtered_tweets)
                return;
            } else {
                this.style.backgroundSize = "55px 55px";
                this.style.width = '55px';
                this.style.height = '55px';
            }
            // var options = {
            //     folder: 'maprover-selection',
            //     types: {
            //         point: 'points',
            //         polygon: 'polygons',
            //         line: 'lines'
            //     }
            // }

            let combineGeoJSON = {
                "type" : "FeatureCollection",
                "features": []
            };
            let xhr_eval = new XMLHttpRequest();
            xhr_eval.open('POST', 'https://2w75f5k0i4.execute-api.us-east-1.amazonaws.com/prod/tweet', true);
            xhr_eval.setRequestHeader('Content-Type', 'application/json');
            xhr_eval.onload = function () {
                let json_rsp = JSON.parse(xhr_eval.responseText);
                container.filtered_tweets = L.geoJSON(json_rsp)
                container.filtered_tweets.addTo(map);
            };
            xhr_eval.send(JSON.stringify(combineGeoJSON));
        }


        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        for (var event in this.options.events)
        {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;

    }
});

var FilterTweetControl =  L.Control.extend({

    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/filter-icon.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';

        this.container.onclick = function(){
            let container = this;
            if (selectionList.length > 0) {
                if (this.style.width == '55px') {
                    this.style.backgroundSize = "45px 45px";
                    this.style.width = '45px';
                    this.style.height = '45px';
                    map.removeLayer(this.filtered_tweets)
                    return
                } else {
                    this.style.backgroundSize = "55px 55px";
                    this.style.width = '55px';
                    this.style.height = '55px';
                }
                // var options = {
                //     folder: 'maprover-selection',
                //     types: {
                //         point: 'points',
                //         polygon: 'polygons',
                //         line: 'lines'
                //     }
                // }
                let combineGeoJSON = {
                    "type" : "FeatureCollection",
                    "features": []
                };
                selectionList.forEach(function (item, index) {
                    combineGeoJSON.features = combineGeoJSON.features.concat(item.toGeoJSON().features);
                });
                let xhr_eval = new XMLHttpRequest();
                xhr_eval.open('POST', 'https://dq4deueez2.execute-api.us-east-1.amazonaws.com/prod/filter', true);
                xhr_eval.setRequestHeader('Content-Type', 'application/json');
                xhr_eval.onload = function () {
                    let json_rsp = JSON.parse(xhr_eval.responseText);
                    container.filtered_tweets = L.geoJSON(json_rsp)
                    container.filtered_tweets.addTo(map);
                };
                xhr_eval.send(JSON.stringify(combineGeoJSON));
            }
        }

        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        for (var event in this.options.events)
        {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;
    }
});

var docuGuide =  L.Control.extend({

    options: {
        position: 'bottomright'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        container.style.backgroundColor = 'white';
        container.style.backgroundImage = "url(images/help7.png)";
        container.style.backgroundSize = "45px 45px";
        container.style.width = '45px';
        container.style.height = '45px';

        container.onclick = function(){
            window.open("guide.html");
        }

        return container;
    }
});

var exportControl =  L.Control.extend({

    options: {
        position: 'bottomright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        this.container.style.backgroundColor = 'white';
        this.container.style.backgroundImage = "url(images/export.png)";
        this.container.style.backgroundSize = "45px 45px";
        this.container.style.width = '45px';
        this.container.style.height = '45px';

        this.container.onclick = function(){
            var options = {
                folder: 'maprover-selection',
                types: {
                    point: 'points',
                    polygon: 'polygons',
                    line: 'lines'
                }
            }
            if (selectionList.length > 0) {
                let combineGeoJSON = {
                    "type" : "FeatureCollection",
                    "features": []
                };
                selectionList.forEach(function (item, index) {
                    combineGeoJSON.features = combineGeoJSON.features.concat(item.toGeoJSON().features);
                });
                shpwrite.download(combineGeoJSON, options);
            }
        }

        /* Prevent click events propagation to map */
        L.DomEvent.disableClickPropagation(this.container);

        /* Prevent right click event propagation to map */
        L.DomEvent.on(this.container, 'contextmenu', function (ev)
        {
            L.DomEvent.stopPropagation(ev);
        });

        /* Prevent scroll events propagation to map when cursor on the div */
        L.DomEvent.disableScrollPropagation(this.container);

        for (var event in this.options.events)
        {
            L.DomEvent.on(this.container, event, this.options.events[event], this.container);
        }
        return this.container;
    }
});

let rail_control = new RailControl();
map.addControl(rail_control);
let airfield_control = new AirfieldControl();
map.addControl(airfield_control);
map.addControl(new TweetControl());
map.addControl(new FilterTweetControl());
map.addControl(new docuGuide());
map.addControl(new locationControl());
exportControl = new exportControl();
map.addControl(exportControl);

layer.addTo(map);

var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

const options = {
    position: 'topleft',
    draw: {
        polyline: false,
        polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            drawError: {
                color: '#e1e100', // Color the shape will turn when intersects
                message: "<strong>Error<strong> line can't intersect itself!" // Message that will show when intersect
            }
        },
        circle: false, // Turns off this drawing tool
        rectangle: false,
        marker: false
    },
    edit: {
        featureGroup: editableLayers, //REQUIRED!!
        remove: true
    }
};

const drawControl = new L.Control.Draw(options);
map.addControl(drawControl);

var selectionList = [];
map.on(L.Draw.Event.CREATED, function(e) {

    const type = e.layerType, layer = e.layer;
    let progressBar = L.control.custom({
        position: 'bottomleft',
        content : '<div class="panel-body">'+
            '    <div class="progress" style="margin-bottom:0px;">'+
            '        <div id="dynamic" class="progress-bar progress-bar-striped passive" role="progressbar" aria-valuenow="41" '+
            '             aria-valuemin="0" aria-valuemax="100" style="min-width: 2em; width: 0%">'+
            '            0% Completed'+
            '        </div>'+
            '    </div>'+
            '</div>',
        classes: 'panel panel-default',
        style: { // superflous?
            width: '200px',
            margin: '20px',
            padding: '0px',
        },
    });
    let rec_lvl = Math.min(this.getZoom() + 5,19);
    // needs refactoring to generalize to different types of tiles
    if (type === 'polygon') {
        if (rail_control.getContainer().style.width=='55px') { // '55px' is a proxy for the button being 'active'
            progressBar.addTo(this);
            let layerGroup = tileAlgebra.bbox_coverage(
                'https://2w75f5k0i4.execute-api.us-east-1.amazonaws.com/prod/infer',
                layer._bounds._northEast,
                layer._bounds._southWest,
                rec_lvl,
                layer.toGeoJSON(),
                progressBar
            );
            layerGroup.addTo(this);
            selectionList.push(layerGroup);
        } else if (airfield_control.getContainer().style.width=='55px') {
            progressBar.addTo(this);
            let layerGroup = tileAlgebra.bbox_coverage(
                'https://8l5w4ajb98.execute-api.us-east-1.amazonaws.com/prod/infer',
                layer._bounds._northEast,
                layer._bounds._southWest,
                rec_lvl,
                layer.toGeoJSON(),
                progressBar
            );
            layerGroup.addTo(this);
            selectionList.push(layerGroup);
        };
    };
});