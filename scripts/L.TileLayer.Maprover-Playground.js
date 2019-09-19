// HTMLCanvasElement.toBlob() polyfill
// copy-pasted off https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

if (!HTMLCanvasElement.prototype.toBlob) {
	Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
		value: function(callback, type, quality) {
			var dataURL = this.toDataURL(type, quality).split(",")[1];
			setTimeout(function() {
				var binStr = atob(dataURL),
					len = binStr.length,
					arr = new Uint8Array(len);

				for (var i = 0; i < len; i++) {
					arr[i] = binStr.charCodeAt(i);
				}

				callback(new Blob([arr], { type: type || "image/png" }));
			});
		},
	});
}

L.TileLayer.addInitHook(function() {
	if (!this.options.useCache) {
		this._db = null;
		return;
	}

	this._db = new PouchDB("offline-tiles");
});

// 🍂 option classifyRailService: String = 'url'
// The url under which classify service runs (POST method)
L.TileLayer.prototype.options.layerGroup = L.layerGroup([]);

// 🍂option classifyRailService: String = 'url'
// The url under which classify service runs (POST method)
L.TileLayer.prototype.options.classifyURLService = "";

// 🍂namespace TileLayer
// 🍂section PouchDB tile caching options
// 🍂option useCache: Boolean = false
// Whether to use a PouchDB cache on this tile layer, or not
L.TileLayer.prototype.options.useCache = false;

// 🍂option saveToCache: Boolean = true
// When caching is enabled, whether to save new tiles to the cache or not
L.TileLayer.prototype.options.saveToCache = true;

// 🍂option useOnlyCache: Boolean = false
// When caching is enabled, whether to request new tiles from the network or not
L.TileLayer.prototype.options.useOnlyCache = false;

// 🍂option cacheFormat: String = 'image/png'
// The image format to be used when saving the tile images in the cache
L.TileLayer.prototype.options.cacheFormat = "image/png";

// 🍂option cacheMaxAge: Number = 24*3600*1000
// Maximum age of the cache, in milliseconds
L.TileLayer.prototype.options.cacheMaxAge = 24 * 3600 * 1000;

L.TileLayer.include({
	// Overwrites L.TileLayer.prototype.createTile
	createTile: function(coords, done) {
		var tile = document.createElement("img");

		tile.onerror = L.bind(this._tileOnError, this, done, tile);

		if (this.options.crossOrigin) {
			tile.crossOrigin = "";
		}

		/*
		 Alt tag is *set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		 */
		tile.alt = "";

		var tileUrl = this.getTileUrl(coords);

		if (this.options.useCache) {
			this._db.get(
				tileUrl,
				{ revs_info: true },
				this._onCacheLookup(tile, tileUrl, done)
			);
		} else {
			// Fall back to standard behaviour
			tile.onload = L.bind(this._tileOnLoad, this, done, tile);
			tile.src = tileUrl;
		}

		return tile;
	},

	// Returns a callback (closure over tile/key/originalSrc) to be run when the DB
	//   backend is finished with a fetch operation.
	_onCacheLookup: function(tile, tileUrl, done) {
		return function(err, data) {
			if (data) {
				return this._onCacheHit(tile, tileUrl, data, done);
			} else {
				return this._onCacheMiss(tile, tileUrl, done);
			}
		}.bind(this);
	},

	_onCacheHit: function(tile, tileUrl, data, done) {
		this.fire("tilecachehit", {
			tile: tile,
			url: tileUrl,
		});

		// Read the attachment as blob
		this._db.getAttachment(tileUrl, "tile").then(
			function(blob) {
				var url = URL.createObjectURL(blob);

				if (
					Date.now() > data.timestamp + this.options.cacheMaxAge &&
					!this.options.useOnlyCache
				) {
					// Tile is too old, try to refresh it
					console.log("Tile is too old: ", tileUrl);

					if (this.options.saveToCache) {
						tile.onload = L.bind(
							this._saveTile,
							this,
							tile,
							tileUrl,
							data._revs_info[0].rev,
							done
						);
					}
					tile.crossOrigin = "Anonymous";
					tile.src = tileUrl;
					tile.onerror = function(ev) {
						// If the tile is too old but couldn't be fetched from the network,
						//   serve the one still in cache.
						this.src = url;
					};
				} else {
					// Serve tile from cached data
					//console.log('Tile is cached: ', tileUrl);
					tile.onload = L.bind(this._tileOnLoad, this, done, tile);
					tile.src = url;
				}
			}.bind(this)
		);
	},

	_onCacheMiss: function(tile, tileUrl, done) {
		this.fire("tilecachemiss", {
			tile: tile,
			url: tileUrl,
		});
		if (this.options.useOnlyCache) {
			// Offline, not cached
			// 	console.log('Tile not in cache', tileUrl);
			tile.onload = L.Util.falseFn;
			tile.src = L.Util.emptyImageUrl;
		} else {
			// Online, not cached, request the tile normally
			// console.log('Requesting tile normally', tileUrl);
			if (this.options.saveToCache) {
				tile.onload = L.bind(
					this._saveTile,
					this,
					tile,
					tileUrl,
					undefined,
					done
				);
			} else {
				tile.onload = L.bind(this._tileOnLoad, this, done, tile);
			}
			tile.crossOrigin = "Anonymous";
			tile.src = tileUrl;
		}
	},


    _tile2long: function (x,z) {
	    return (x/Math.pow(2,z)*360-180);
    },

    _tile2lat: function (y,z) {
        var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
        return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    },

	// Async'ly saves the tile as a PouchDB attachment
	// Will run the done() callback (if any) when finished.
	_saveTile: function(tile, tileUrl, existingRevision, done) {
		if (!this.options.saveToCache) {
			return;
		}


		var url = new URL(tileUrl)
		path_array = (url.pathname.split('/'))

		var canvas = document.createElement("canvas");
		canvas.width = tile.naturalWidth || tile.width;
		canvas.height = tile.naturalHeight || tile.height;

		var context = canvas.getContext("2d");
		context.drawImage(tile, 0, 0);

		var format = this.options.cacheFormat;

		var dataURL = canvas.toDataURL("image/png");
		var base64_str = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")
        var z = path_array[1];
		var x = path_array[2];
		var y = path_array[3];
		var body_json = { "z": z, "x": x, "y": y, "tile_base64": base64_str }
		if (this.options.classifyURLService != "") {
		    y = y.split('.')[0]
            var nw_long = this._tile2long(parseFloat(x), parseFloat(z))
            var nw_lat = this._tile2lat(parseFloat(y), parseFloat(z))
            var se_long = this._tile2long(parseFloat(x)+1, parseFloat(z))
            var se_lat = this._tile2lat(parseFloat(y)+1, parseFloat(z))
            var rect = L.rectangle([[nw_lat, nw_long], [se_lat, se_long]]);

            var xhr = new XMLHttpRequest();
            xhr.z = z
            xhr.rect = rect
            xhr.layerGroup = this.options.layerGroup;
			xhr.open('POST', this.options.classifyURLService, true);
			xhr.setRequestHeader('Content-Type', 'application/json');

			xhr.onload = function () {
			    let json_rsp = JSON.parse(xhr.responseText);
			    if (json_rsp.RailClass) {
			        if (xhr.z == 19) {
                        this.layerGroup.addLayer(xhr.rect);
                    }
                }
			};
		} else {
			console.log('No url to post')
		}



		xhr.send(JSON.stringify(body_json));

		canvas.toBlob(
			function(blob) {
				this._db
					.put({
						_id: tileUrl,
						_rev: existingRevision,
						timestamp: Date.now(),
					})
					.then(
						function(status) {
							return this._db.putAttachment(
								tileUrl,
								"tile",
								status.rev,
								blob,
								format
							);
						}.bind(this)
					)
					.then(function(resp) {
						if (done) {
							done();
						}
					})
					.catch(function() {
						// Saving the tile to the cache might have failed,
						// but the tile itself has been loaded.
						if (done) {
							done();
						}
					});
			}.bind(this),
			format
		);
	},

	// 🍂section PouchDB tile caching methods
	// 🍂method seed(bbox: LatLngBounds, minZoom: Number, maxZoom: Number): this
	// Starts seeding the cache given a bounding box and the minimum/maximum zoom levels
	// Use with care! This can spawn thousands of requests and flood tileservers!
	seed: function(bbox, minZoom, maxZoom) {
		if (!this.options.useCache) return;
		if (minZoom > maxZoom) return;
		if (!this._map) return;

		var queue = [];

		for (var z = minZoom; z <= maxZoom; z++) {
			// Geo bbox to pixel bbox (as per given zoom level)...
			var northEastPoint = this._map.project(bbox.getNorthEast(), z);
			var southWestPoint = this._map.project(bbox.getSouthWest(), z);

			// Then to tile coords bounds, as per GridLayer
			var tileBounds = this._pxBoundsToTileRange(
				L.bounds([northEastPoint, southWestPoint])
			);

			for (var j = tileBounds.min.y; j <= tileBounds.max.y; j++) {
				for (var i = tileBounds.min.x; i <= tileBounds.max.x; i++) {
					var point = new L.Point(i, j);
					point.z = z;
					queue.push(this._getTileUrl(point));
				}
			}
		}

		var seedData = {
			bbox: bbox,
			minZoom: minZoom,
			maxZoom: maxZoom,
			queueLength: queue.length,
		};
		this.fire("seedstart", seedData);
		var tile = this._createTile();
		tile._layer = this;
		this._seedOneTile(tile, queue, seedData);
		return this;
	},

	_createTile: function() {
		return document.createElement("img");
	},

	// Modified L.TileLayer.getTileUrl, this will use the zoom given by the parameter coords
	//  instead of the maps current zoomlevel.
	_getTileUrl: function(coords) {
		var zoom = coords.z;
		if (this.options.zoomReverse) {
			zoom = this.options.maxZoom - zoom;
		}
		zoom += this.options.zoomOffset;
		return L.Util.template(
			this._url,
			L.extend(
				{
					r:
						this.options.detectRetina &&
						L.Browser.retina &&
						this.options.maxZoom > 0
							? "@2x"
							: "",
					s: this._getSubdomain(coords),
					x: coords.x,
					y: this.options.tms
						? this._globalTileRange.max.y - coords.y
						: coords.y,
					z: this.options.maxNativeZoom
						? Math.min(zoom, this.options.maxNativeZoom)
						: zoom,
				},
				this.options
			)
		);
	},

	// Uses a defined tile to eat through one item in the queue and
	//   asynchronously recursively call itself when the tile has
	//   finished loading.
	_seedOneTile: function(tile, remaining, seedData) {
		if (!remaining.length) {
			this.fire("seedend", seedData);
			return;
		}
		this.fire("seedprogress", {
			bbox: seedData.bbox,
			minZoom: seedData.minZoom,
			maxZoom: seedData.maxZoom,
			queueLength: seedData.queueLength,
			remainingLength: remaining.length,
		});

		var url = remaining.shift();

		this._db.get(
			url,
			function(err, data) {
				if (!data) {
					/// FIXME: Do something on tile error!!
					tile.onload = function(ev) {
						this._saveTile(tile, url, null); //(ev)
						this._seedOneTile(tile, remaining, seedData);
					}.bind(this);
					tile.crossOrigin = "Anonymous";
					tile.src = url;
				} else {
					this._seedOneTile(tile, remaining, seedData);
				}
			}.bind(this)
		);
	},
});
