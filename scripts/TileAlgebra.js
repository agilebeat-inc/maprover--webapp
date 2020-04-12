"use strict";

var tileAlgebra = (function () {

    // https://en.wikipedia.org/wiki/Web_Mercator_projection
    // https://wiki.openstreetmap.org/wiki/Mercator
    // original versions of these functions were copy-pasted from this OSM wiki:
    // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
    
    // at zoom level z, tiles are enumerated from 0 to 2^n
    let tile2long = function (x, z) {
        return 360 * x / (2<<(z-1)) - 180;
    };
    
    let long2tile = function (lon, zoom) {
        return Math.floor((2<<(zoom-1)) * (lon + 180) / 360);
    }

    const [RAD2DEG,DEG2RAD] = [180 / Math.PI, Math.PI / 180];
    
    let tile2lat = function (y, z) {
        const yProj = Math.PI * ( 1 - y / (2<<(z-2)) );
        return RAD2DEG * Math.atan(0.5 * (Math.exp(yProj) - Math.exp(-yProj))); // hyperbolic sine
    };
    
    let lat2tile = function (lat, zoom) {
        const [rads, zscl] = [lat * DEG2RAD, 2 << (zoom-2)]; // Math.pow(2,zoom)/2;
        const yProj = Math.log(Math.tan(rads) + 1/Math.cos(rads));
        return Math.floor( zscl * (1 - yProj / Math.PI) );
    }

    // return a leaflet rectangle which will get added to the map (as part of a LayerGroup)
    let _get_as_rectangle = function (x, y, z) {

        let nw_long = tile2long(x, z);
        let nw_lat = tile2lat(y, z);
        // let se_long = tile2long(nx + 1, nz);
        let se_long = nw_long + 360 / (2<<z-1);
        let se_lat = tile2lat(y + 1, z);
        if([nw_long,nw_lat,se_long,se_lat].some(e => isNaN(e))) console.error(`Inputs x=${x}, y=${y}, z=${z} gave error!`);
        let rv = L.rectangle([[nw_lat, nw_long], [se_lat, se_long]],{color: '#3388dd',opacity: 0.8});
        // add any desired options now or later, e.g. a tooltip with predicted probability...or opacity proportional to prob.?
        return rv;
    }

    // get the dataURL representation of a (loaded!) image
    let img_b64 = function(img,format = 'png',quality = 1) {
        
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        [canvas.width, canvas.height] = [img.width, img.height];
        context.drawImage(img, 0, 0);
        // note, quality affects jpeg or webp but not png!
        let dataURL = canvas.toDataURL(`image/${format}`,quality);
        return dataURL;
    }

    // https://stackoverflow.com/questions/45788934/how-to-turn-this-callback-into-a-promise-using-async-await
    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', reject);
            img.src = url;
        });
    }
    
    // this is a good use case for WebWorkers; see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
    let validate_tile = async function (service_endpoint, category, x, y, z) {
        
        const AorBorC = 'abc'[Math.floor(Math.random() * 3)];
        let tileURL = `https://${AorBorC}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        // console.log(`getting tile: ${tileURL}`);
        // the first async request is to get the tile defined by x/y/z from OSM server, and convert it into base64enc string
        const img = await loadImage(tileURL);
        let tileB64 = img_b64(img);
        tileB64 = tileB64.replace(/^data:image\/(png|jpg);base64,/, "");
        // the next async result is sending the string to classifier(s)
        const request_body = {
            z: z,
            x: x,
            y: y,
            category: category,
            tile_base64: tileB64
        };
        // placeholder:
        let res = tileB64.length % 8; // lengths are ALL even for some reason!
        return res === 0;
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
        const response = await fetch(service_endpoint, {
            method: 'GET',
            mode: 'cors',
            cache: 'default',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'origin',
            body: JSON.stringify(request_body)
        });
        return await response.json();
    }

    // 'tol' is the minimum overlap in terms of area we'll accept
    // to consider that a tile is 'inside' the polygon
    let tile_in_poly = function(poly,tile,tol = 0.5) {
        if(turf.booleanContains(poly,tile)) return true;
        if(turf.booleanOverlap(poly,tile)) {
            let tile_area = turf.area(tile);
            let int_area = turf.area(turf.intersect(poly,tile));
            return int_area >= tol * tile_area;
        }
        return false;
    }

    // given the polygon geoJSON, figure out which tiles are within the polygon
    // should this be parallelized or given to workers? If it is very fast compared to sending all the HTTP requests
    // to AWS, then perhaps we do this in the main thread and just offload the validation
    let filter_tiles = function(NE,SW,z,polygon_gj) {
        const polygon_tf = turf.polygon(polygon_gj.geometry.coordinates);
        let start_x = long2tile(SW.lng, z);
        let stop_x  = long2tile(NE.lng, z);
        let start_y = lat2tile(NE.lat, z);
        let stop_y  = lat2tile(SW.lat, z);
        console.log(`Running from x: [${start_x} -- ${stop_x}] and y: [${start_y} -- ${stop_y}]`);
        console.log(`That's a total of ${Math.abs((start_x-stop_x+1)*(start_y - stop_y + 1))} tiles to check!`);
        let res = [];
        // this is the naive and slow way, but we cannot assume the polygon is convex!
        for (let x = start_x; x <= stop_x; x++) {
            for (let y = start_y; y <= stop_y; y++) {
                let rect = _get_as_rectangle(x, y, z);
                let rect_tf = turf.polygon(rect.toGeoJSON().geometry.coordinates);
                if (tile_in_poly(polygon_tf, rect_tf)) { 
                    res.push([x,y,z]);
                }
            }
        }
        console.log(`Found a total of ${res.length} tiles intersecting the polygon!`);
        return res;
    }

    // unique values of array (not necessarily preseving order!)
    let unique = function(x) {
        return [...new Set(x)];
    }

    let tile_validator = async function (service_endpoint, category, northEast, southWest, z, polygon_gj) {
            
        const tiles_in_poly = filter_tiles(northEast,southWest,z,polygon_gj);
        let nvalidate = tiles_in_poly.length;
        
        if(nvalidate === 0) return layerGroup;
        // let update_freq = Math.ceil(nvalidate/100);
        // let nupdates = Math.floor(nvalidate/update_freq);
        let layerGroup = L.layerGroup([]);
        
        // need to offload this task to WebWorkers?
        // let resultset = new Set();
        let include_neighbors = false;
        // need to refactor: don't wait till end to load tiles onto map
        let validated_tiles = tiles_in_poly.map(e => {
            return new Promise((resolve,reject) => {
                try {
                    let res = validate_tile(service_endpoint,category,...e)
                    .then(
                        // update progress bar here!
                        // if we append to map, can we also track the items as a LayerGroup?
                        rv => { return {coords: e, valid: rv} });
                    resolve(res);
                }
                catch(e) {
                    reject(e);
                }
            });
        });
        
        await Promise.all(
            validated_tiles
        ).then(function(tiles) {
            let num_pos = tiles.reduce((v,e) => v + e.valid, 0);
            console.log(`Before filtering: ${num_pos} positive and ${tiles.length - num_pos} negative tiles`);
            tiles = tiles.filter(e => e.valid);
            console.info(`There are ${tiles.length} tiles to add to the map!`);
            // tiles.forEach(e => resultset.add(e));
            tiles.forEach(e => {
                let rect = _get_as_rectangle(...e.coords);
                // any other rect options, etc. may be set
                layerGroup.addLayer(rect);
            });
        });
        return layerGroup;
    }

    // a Javascript 'namespace'
    let TF = {
        // needs to return a layerGroup, see https://leafletjs.com/reference-1.6.0.html#layergroup
        // which the calling function will add to the map
        bbox_coverage: tile_validator,
        // expose some more of the internal functions for testing/development
        validate_tile: validate_tile,
        as_rect: _get_as_rectangle
    }
    return TF;
})();
