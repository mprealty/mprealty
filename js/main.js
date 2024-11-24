 // Initialize the map
 const map = L.map("map").setView([16.440286, 80.509293], 10);

 // Add base layers
 const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
     maxZoom: 22,
     attribution: "&copy; OpenStreetMap "
 });

 const googleSatellite = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
     maxZoom: 22,
     subdomains: ["mt0", "mt1", "mt2", "mt3"],
     attribution: "&copy; MP Realty"
 }).addTo(map);

 const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
     maxZoom: 22,
     subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
     attribution: '&copy; MP Realty'
 });

 const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
     maxZoom: 22,
     subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
     attribution: '&copy; MP Realty'
 });

// Function to handle map clicks on the WMS layer
map.on("click", function (e) {
const url = getFeatureInfoUrl(e.latlng);
if (!url) return;

// Make an AJAX request to fetch feature info
$.ajax({
 url: url,
 success: function (data) {
     if (data && data.features && data.features.length > 0) {
         const properties = data.features[0].properties; // Extract feature properties
         const popupContent = getWmsPopupContent(properties);
         L.popup()
             .setLatLng(e.latlng)
             .setContent(popupContent)
             .openOn(map);
     } else {
         L.popup()
             .setLatLng(e.latlng)
             .setContent("No data available at this location.")
             .openOn(map);
     }
 },
 error: function () {
     L.popup()
         .setLatLng(e.latlng)
         .setContent("Failed to fetch data.")
         .openOn(map);
 },
});
});

// Construct the GetFeatureInfo URL
function getFeatureInfoUrl(latlng) {
const point = map.latLngToContainerPoint(latlng, map.getZoom());
const size = map.getSize();
const wmsParams = {
 request: "GetFeatureInfo",
 service: "WMS",
 srs: "EPSG:4326",
 styles: "",
 transparent: true,
 version: "1.1.1",
 format: "image/png",
 bbox: map.getBounds().toBBoxString(),
 height: size.y,
 width: size.x,
 layers: "ap_projects:ap approved plots group", // Replace with your WMS layer's name
 query_layers: "approved_plots_final", // Replace with your WMS layer's name 
 info_format: "application/json", // Format for the response
 x: Math.round(point.x),
 y: Math.round(point.y),
};

return (
 "https://mprealty.live/geoserver/ap_projects/wms?" +
 Object.keys(wmsParams)
     .map((key) => `${key}=${encodeURIComponent(wmsParams[key])}`)
     .join("&")
);
}

// Generate popup content from WMS feature properties
function getWmsPopupContent(properties) {
return `        
         <div class="popup-header">PLOT INFORMATION</div>
         <p><strong>Plot Number :</strong> ${properties.PLOT_NUMB}</p>
         <div><strong>Sq Yards :</strong> ${properties.SQ_YARDS || "N/A"}</div>
         <div><strong>Plot Code :</strong> ${properties.PLOT_CODE || "N/A"}</div>
         <div><strong>Village Name :</strong> ${properties.VILGE_NAME || "N/A"}</div>
         <div><strong>Survey Numbers :</strong> ${properties.SURVY_NUMB || "N/A"}</div>
         <p><strong>LP-Number :</strong> ${properties.LP_NUMBER}</p>
         <div><strong>Other Info :</strong> ${properties.OTHER_INFO || "N/A"}</div>
         <div><strong>Approval :</strong> ${properties.APPROVAL || "N/A"}</div>
         <p><strong>Layout Map :</strong> <a href="${properties.LAYOUT_MAP}"target="_blank">View Map</a></p>
         <p style="font-size: 12px; color: gray;">Note: Map not to scale. Designed for informational use only.</p>
 `;
 }

 // Add WMS layer
 const wmsLayer = L.tileLayer.wms("https://mprealty.live/geoserver/ap_projects/wms?", {
     maxZoom: 23,
     layers: "ap_projects:ap approved plots group",
     format: "image/png",
     transparent: true,
     attribution: ""
 }).addTo(map);

 // Layer Control
 L.control.layers({
 "OpenStreetMap": osmLayer,
 "Google Satellite": googleSatellite,
 "Google Hybrid": googleHybrid,
 "Google Streets": googleStreets
 }, 

 {
 "Approved Plots": wmsLayer
 }).addTo(map);

 // WFS layer variables
 let wfsLayer;
 const geoserverWfsUrl = "https://mprealty.live/geoserver/ap_projects/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ap_projects:approved_plots_final&outputFormat=application/json";

 // Fetch suggestions based on user input
 function fetchSuggestions() {
     const input = document.getElementById("plotCodeInput").value.trim();

     if (!input) {
         document.getElementById("suggestionBox").innerHTML = "";
         return;
     }

     // Fetch filtered data from WFS
     const url = `${geoserverWfsUrl}&CQL_FILTER=PLOT_CODE ILIKE '%25${input}%25'`;
     fetch(url)
         .then(response => response.json())
         .then(data => {
             const suggestions = data.features.map(feature => feature.properties.PLOT_CODE);
             if (suggestions.length > 0) {
             showSuggestions(suggestions.slice(0, 6)); // Show up to 6 suggestions                
            } else {
                document.getElementById("suggestionBox").innerHTML = "<div>Not found</div>";
            }
         })
         .catch(error => console.error("Error fetching WFS data:", error));
 }

 // Show suggestions in a suggestion box
 function showSuggestions(suggestions) {
     const suggestionBox = document.getElementById("suggestionBox");
     suggestionBox.innerHTML = suggestions
         .map(suggestion => `<div onclick="selectSuggestion('${suggestion}')">${suggestion}</div>`)
         .join("");
 }

 // Handle suggestion selection
 function selectSuggestion(plotCode) {
     document.getElementById("plotCodeInput").value = plotCode;
     document.getElementById("suggestionBox").innerHTML = "";
     searchPlot(plotCode);
 }

 // Search and highlight a plot
 function searchPlot(plotCode) {
     const url = `${geoserverWfsUrl}&CQL_FILTER=PLOT_CODE='${plotCode}'`;

     fetch(url)
         .then(response => response.json())
         .then(data => {
             if (data.features.length > 0) {
                 const feature = data.features[0];
                 const bounds = L.geoJSON(feature).getBounds();

                 // Remove previous WFS layer
                 if (wfsLayer) {
                     map.removeLayer(wfsLayer);
                 }

                 // Add new WFS layer
                 wfsLayer = L.geoJSON(data, {
                     style: { color: "red", weight: 3 }
                 }).addTo(map);

                 map.fitBounds(bounds);

                 // Show popup
                 const properties = feature.properties;
                 const popupContent = `
                 <div class="popup-header">PLOT INFORMATION</div>
                     <p><strong>Plot Number :</strong> ${properties.PLOT_NUMB}</p>
                     <div><strong>Sq Yards :</strong> ${properties.SQ_YARDS || "N/A"}</div>
                     <div><strong>Plot Code :</strong> ${properties.PLOT_CODE || "N/A"}</div>
                     <div><strong>Village Name :</strong> ${properties.VILGE_NAME || "N/A"}</div>
                     <div><strong>Survey Numbers :</strong> ${properties.SURVY_NUMB || "N/A"}</div>
                     <p><strong>LP-Number :</strong> ${properties.LP_NUMBER}</p>
                     <div><strong>Other Info :</strong> ${properties.OTHER_INFO || "N/A"}</div>
                     <div><strong>Approval :</strong> ${properties.APPROVAL || "N/A"}</div>
                     <p><strong>Layout Map :</strong> <a href="${properties.LAYOUT_MAP}"target="_blank">View Map</a></p>
                     <p style="font-size: 12px; color: gray;">Note: Map not to scale. Designed for informational use only.</p>
                 `;
                 L.popup()
                     .setLatLng(bounds.getCenter())
                     .setContent(popupContent)
                     .openOn(map);
             } else {
                 alert("Plot not found!");
             }
         })
         .catch(error => console.error("Error searching plot:", error));
 }

 // Clear the search box
 function clearSearch() {
     document.getElementById("plotCodeInput").value = "";
     document.getElementById("suggestionBox").innerHTML = "";
     if (wfsLayer) {
         map.removeLayer(wfsLayer);
     }
 }

     L.Control.geocoder().addTo(map);
     L.control.locate().addTo(map);
