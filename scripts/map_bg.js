"use strict";
// background map settings for sign-in, register, and verify pages
// in proper ES-6 we would have import L from leaflet - in practice we assume that
// leafet.js has been imported already so that the global L var is defined

const mapLink = '<a href="https://openstreetmap.org">OpenStreetMap</a>';
const map = L.map('map', {zoomControl: false}).setView([-41.2858, 174.78682], 14);

L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: `&copy; ${mapLink} Contributors`,
        maxZoom: 18,
    }).addTo(map);
