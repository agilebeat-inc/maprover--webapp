"use strict";

class progress_tracker {
    // eid: id of element in document that needs updating
    // nsteps: number of total steps
    constructor(eid,nsteps) {
        this._id = eid;
        this._nsteps = nsteps;
        this._status = 0;
        this.update_display();
    }
    get status() { return this._status; }
    get length() { return this._nsteps; }

    // this is inherently specific to what we're using (here, Bootstrap) for the progress bar
    update_display() {
        const outPct = Math.round(100 * Math.min(this._nsteps,this._status) / this._nsteps);
        // need to keep width style attribute and 'aria-valuenow' tag attribute in sync
        let pbar = document.getElementById(this._id);
        pbar.style.width = `${outPct}%`;
        pbar.setAttribute('aria-valuenow',outPct);
        pbar.innerHTML = outPct >= 100 ? 'Complete!' : `${outPct}%`;
    }
    update(k) {
        this._status = k;
        this.update_display();
    }
    increment() {
        this._status++;
        this.update_display();
    }
}


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
    let get_as_rectangle = function (x, y, z, options = {color: '#3388dd',opacity: 0.8}) {

        let nw_long = tile2long(x, z);
        let nw_lat = tile2lat(y, z);
        // let se_long = tile2long(nx + 1, nz);
        let se_long = nw_long + 360 / (2<<z-1);
        let se_lat = tile2lat(y + 1, z);
        if([nw_long,nw_lat,se_long,se_lat].some(e => isNaN(e))) console.error(`Inputs x=${x}, y=${y}, z=${z} gave error!`);
        return L.rectangle([[nw_lat, nw_long], [se_lat, se_long]],options);
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
            img.addEventListener('error', e => reject(e)); // should handle this better than just dumping the error?
            img.src = url;
        });
    }
    
    // this is a good use case for WebWorkers; see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
    // to avoid the chance of the main browser window freezing
    let validate_tile = async function (service_endpoint, x, y, z) {
        
        const AorBorC = 'abc'[Math.floor(Math.random() * 3)];
        let tileURL = `https://${AorBorC}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        // the first async request is to get the tile defined by x/y/z from OSM server, and convert it into base64enc string
        // it seems like this one takes up most of the time
        const t0 = Date.now();
        const img = await loadImage(tileURL);
        const t1 = Date.now();
        let tileB64 = img_b64(img);
        // tileB64 = tileB64.replace(/^data:image\/(png|jpg);base64,/,"");
        if(tileB64.slice(0,22) === 'data:image/png;base64,') tileB64 = tileB64.slice(22);
        // let now = (new Date(Date.now())).toISOString();
        // console.debug(`@${now}: length of b64 string @ ${x}/${y}/${z}: ${tileB64.length}`);
        // the next async result is sending the string to classifier(s)
        const request_body = {
            z: z,
            x: x,
            y: y,
            tile_base64: tileB64
        };
        // placeholder:
        // return Math.random() < 0.33;
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
        const response = await fetch(service_endpoint, {
            method: 'POST',
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
        let resp = await response.json();
        const t2 = Date.now();
        console.info(`${x}/${y}/${z} (length ${tileB64.length}): waited ${t1-t0}ms OSM and ${t2-t1}ms Lambda.`);
        // we hope that the model name is consistently returned in the JSON...
        const model_name = service_endpoint.split('/').pop();
        return resp.hasOwnProperty(model_name) && resp[model_name] === true;
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
        // console.info(`Running from x: [${start_x} -- ${stop_x}] and y: [${start_y} -- ${stop_y}]`);
        // console.info(`That's a total of ${Math.abs((start_x-stop_x+1)*(start_y - stop_y + 1))} tiles to check!`);
        
        let res = [];
        // this is the naive and slow way, but we cannot assume the polygon is convex!
        for (let x = start_x; x <= stop_x; x++) {
            for (let y = start_y; y <= stop_y; y++) {
                let rect = get_as_rectangle(x, y, z, {});
                let rect_tf = turf.polygon(rect.toGeoJSON().geometry.coordinates);
                if (tile_in_poly(polygon_tf, rect_tf)) { 
                    res.push([x,y,z]);
                }
            }
        }
        // console.debug(`Found a total of ${res.length} tiles intersecting the polygon!`);
        return res;
    }

    let tile_validator = async function (service_endpoint, northEast, southWest, z, color, id, polygon_gj) {
        
        const tiles_in_poly = filter_tiles(northEast,southWest,z,polygon_gj);
        const nvalidate = tiles_in_poly.length;
        // console.debug(`There are ${nvalidate} tiles to check...`);
        
        if(nvalidate === 0) { // this shouldn't be possible, really
            // console.error(`Search yielded no tiles to query!`);
            haveSnack('No tiles to query!');
            return null;
        }

        // will need to assign it a unique ID since there can be multiple progress bars
        let barID = `prog_${id}`;
        const bar_class = "progress-bar progress-bar-striped active";
        const bar_style = `style="min-width: 1em; width: 0%; background-color: ${color}"`;
        let progressBar = L.control.custom({
            position: 'bottomleft',
            content : 
            `<div class="panel-body">
                <div class="progress" style="margin-bottom:0px;">
                    <div id="${barID}" class="${bar_class}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" ${bar_style}>
                    '0%'
                    </div>
                </div>
            </div>`,
            classes: 'panel panel-default', // by default 'leaflet-control' also becomes one of the classes
            style: { // overriding the default Bootstrap styles
                width: '200px',
                margin: '20px',
                padding: '0px',
            }
        });
        progressBar.addTo(map);
        let prog_trak = new progress_tracker(barID,nvalidate);
        // https://leafletjs.com/examples/map-panes/
        // as a side-effect createPane automatically inserts into the map and creates a classname based on the name [...]Pane
        // if there are multiple queries running simultaneously, we need to keep the temp panes separate
        const paneID = `${barID}_temp`;
        let tPane = map.createPane(paneID);
        map.getPane(paneID).style.zIndex = 450; // between the default overlay pane and the next higher shadow pane
        let search_layer = L.featureGroup([],{pane: 'overlayPane'}); // this is the 'permanent' return value

        // need to offload this task to WebWorkers?
        let validated_tiles = tiles_in_poly.map(e => {
            return new Promise((resolve,reject) => {
                validate_tile(service_endpoint,...e)
                    .then( rv => {
                        // if we append to map, can we also track the items as a LayerGroup
                        // update progress bar
                        prog_trak.increment();
                        // create the temp copy with pane specified in options:
                        if(rv) {
                            let tmpRect = get_as_rectangle(...e,{pane: paneID,color: color,opacity: 0.6});
                            tmpRect.addTo(map);
                        }
                        resolve({coords: e, valid: rv});
                    })
                    .catch(e => {
                        console.error(`Error validating tile: ${e}`);
                        reject(e);
                    });
            });
        });
        // Promise.all fails if any fail, so instead we want Promise.allSettled
        // it necessitates one more filter since the return values are wrapped in Object{status: 'fulfulled', value:{...}}
        await Promise.allSettled(
            validated_tiles
        ).then(function(tiles) {
            // first discard any rejected tiles (could retry with these?)
            let r_tiles = tiles.filter(e => e.status === 'fulfilled').map(e => e.value);
            console.log(`Of the ${tiles.length} requested tiles, ${r_tiles.length} tiles were successfully resolved.`);
            let num_pos = r_tiles.reduce((v,e) => v + e.valid, 0);
            console.log(`Before filtering: ${num_pos} positive and ${r_tiles.length - num_pos} negative tiles`);
            let v_tiles = r_tiles.filter(e => e.valid);
            console.info(`There are ${v_tiles.length} tiles to add to the map!`);
            if(v_tiles.length === 0) {
                // here, we don't want to create a control box since no tiles will be added.
                // instead, we should have an ephemeral popup indicating that no tiles matched the query
                console.info('Having a zero snack...');
                haveSnack("No tiles were found!",color);
            } else {
                v_tiles.forEach(e => {
                    let rect = get_as_rectangle(...e.coords,{color: color, opacity: 0.75});
                    rect.bindTooltip('Hi there!');
                    // any other rect options, etc. may be set
                    search_layer.addLayer(rect);
                });
            }
        });
        // remove progress bar to clean up
        map.removeLayer(progressBar);
        progressBar.remove();
        // remove temp pane and add search_layer (hoping user cannot see in between!)
        map.getPane(paneID).remove();
        return search_layer;
    }

    // a Javascript 'namespace'
    let TF = {
        // needs to return a layerGroup, see https://leafletjs.com/reference-1.6.0.html#layergroup
        // which the calling function will add to the map
        bbox_coverage: tile_validator,
        // expose some more of the internal functions for testing/development
        validate_tile: validate_tile,
        as_rect: get_as_rectangle
    }
    return TF;
})();
