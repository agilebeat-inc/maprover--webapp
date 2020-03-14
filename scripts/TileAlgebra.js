//cross browser
window.URL = window.URL || window.webkitURL;


var tileAlgebra = (function () {
    let max = 0;
    let current_progress = 0;

    let _tile2long = function (x, z) {
        return (x / Math.pow(2, z) * 360 - 180);
    };

    let _tile2lat = function (y, z) {
        let n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    };

    let _get_as_rectangle = function (x, y, z) {
        let nw_long = _tile2long(parseFloat(x), parseFloat(z));
        let nw_lat = _tile2lat(parseFloat(y), parseFloat(z));
        let se_long = _tile2long(parseFloat(x) + 1, parseFloat(z));
        let se_lat = _tile2lat(parseFloat(y) + 1, parseFloat(z));
        let rect = L.rectangle([[nw_lat, nw_long], [se_lat, se_long]]);
        return rect;
    }

    let _long2tile = function (lon, zoom) {
        return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    };
    let _lat2tile = function (lat, zoom) {
        const deg = lat * Math.PI / 180;
        return  Math.pow(2, zoom) * Math.floor((1 - Math.log(Math.tan(deg) + 1 / Math.cos(deg)) / Math.PI) / 2);
    };

    let _handle_progress_bar = function(progressBar) {
        let cp = Math.round(100 * current_progress / max);
        if (cp >= 100) {
            max = 0;
            current_progress = 0;
            progressBar.remove();
        }
        $("#dynamic")
            .css("width", cp + "%")
            .attr("aria-valuenow", cp)
            .text(cp + "% Complete");
    };

    let _mark_xyz_tile = function(x, y, z, tile_map) {
        if (typeof tile_map.get(z) === 'undefined')
            tile_map.set(z, new Map())
        if (typeof tile_map.get(z).get(x) === 'undefined')
            tile_map.get(z).set(x, new Map())
        if (typeof tile_map.get(z).get(x).get(y) === 'undefined')
            tile_map.get(z).get(x).set(y, true)
    };

    let _check_if_xyz_tile_is_marked = function(x, y, z, tile_map) {
        if (typeof tile_map.get(z) === 'undefined')
            return false
        if (typeof tile_map.get(z).get(x) === 'undefined')
            return false
        if (typeof tile_map.get(z).get(x).get(y) === 'undefined')
            return false
        return true
    }

    let _add_rectangle = function(x, y, z, layerGroup, tile_map) {
        if (!_check_if_xyz_tile_is_marked(x, y, z, tile_map)) {
            _mark_xyz_tile(x, y, z, tile_map);
            let rect = _get_as_rectangle(x, y, z);
            layerGroup.addLayer(rect);
        }
    }

    let _add_rectangle_with_neighbors = function(x, y, z, layerGroup, tile_map) {
        const coords = [[x,y],[x-1,y],[x-1,y-1],[x,y-1],[x+1,y],[x+1,y-1],[x+1,y+1],[x-1,y+1]];
        coords.forEach(cc => _add_rectangle(cc[0],cc[1],z,layerGroup,tile_map));
        // _add_rectangle(x, y, z, layerGroup, tile_map);
        // _add_rectangle(x-1, y, z, layerGroup, tile_map);
        // _add_rectangle(x-1, y-1, z, layerGroup, tile_map);
        // _add_rectangle(x, y-1, z, layerGroup, tile_map);
        // _add_rectangle(x+1, y-1, z, layerGroup, tile_map);
        // _add_rectangle(x+1, y, z, layerGroup, tile_map);
        // _add_rectangle(x+1, y+1, z, layerGroup, tile_map);
        // _add_rectangle(x, y+1, z, layerGroup, tile_map);
        // _add_rectangle(x-1, y+1, z, layerGroup, tile_map);
    }


    let _validate_tile = function (service_endpoint, x, y, z, polygon_gj, layerGroup, progressBar, tile_map) {
        let polygon_tf = turf.polygon(polygon_gj.geometry.coordinates);
        let rect = _get_as_rectangle(x, y, z);
        let rect_tf = turf.polygon(rect.toGeoJSON().geometry.coordinates);
        if (!turf.booleanContains(polygon_tf, rect_tf)) {
            return;
        }

        downloadedImg = new Image;

        _onload = function () {
            let canvas = document.createElement("canvas");
            let context = canvas.getContext("2d");

            canvas.width = this.width;
            canvas.height = this.height;
            context.drawImage(this, 0, 0);
            let dataURL = canvas.toDataURL("image/png");
            let tileB64 = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
            let body_json = {
                "z": z.toString(),
                "x": x.toString(),
                "y": y.toString() + ".png",
                "tile_base64": tileB64
            };
            let xhr_eval = new XMLHttpRequest();
            xhr_eval.open('POST', service_endpoint, true);
            xhr_eval.setRequestHeader('Content-Type', 'application/json');
            xhr_eval.onload = function () {
                let json_rsp = JSON.parse(xhr_eval.responseText);
                if (json_rsp.RailClass) {
                    _add_rectangle_with_neighbors(x, y, z, layerGroup, tile_map)
                    //let rect = _get_as_rectangle(x, y, z);
                    //layerGroup.addLayer(rect);
                }
            };
            increase_counter = function() {
                current_progress++;
                _handle_progress_bar(progressBar);
            }
            xhr_eval.onloadend = increase_counter;
            xhr_eval.send(JSON.stringify(body_json));
        };
        max++;
        downloadedImg.crossOrigin = "Anonymous";
        downloadedImg.addEventListener("load", _onload, false);
        let success = true;
        downloadedImg.addEventListener("error", function () {success=false;current_progress++;}, false);
        downloadedImg.addEventListener("timeout", function () {current_progress++;}, false);
        // let servers = 'abc';
        // let server_str = servers[Math.floor(Math.random() * servers.length)];
        let tileURL = `https://50dht0jpe7.execute-api.us-east-1.amazonaws.com/prod/wmts/${z}/${x}/${y}.png`;
        //let tileURL = 'https://'+ server_str +'.tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
        downloadedImg.src = tileURL;
        return success;
    };

    return {
        bbox_coverage: function (service_endpoint, northEast, southWest, z, polygon_gj, progressBar, map) {
            _handle_progress_bar();
            let layerGroup = L.layerGroup([]);
            let stop_x = _long2tile(northEast.lng, z);
            let start_y = _lat2tile(northEast.lat, z);
            let start_x = _long2tile(southWest.lng, z);
            let stop_y = _lat2tile(southWest.lat, z);
            let tile_map = new Map();
            for (let x = start_x; x <= stop_x; x++) {
                for (let y = start_y; y <= stop_y; y++) {
                    for (let i = 0; i < 5; i++) {
                        if(_validate_tile(service_endpoint, x, y, z, polygon_gj, layerGroup, progressBar, map, tile_map)) break;
                    }
                };
            };
            return layerGroup;
        }
    };
})();


