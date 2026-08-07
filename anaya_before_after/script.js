/*
 * Click-to-view photo tour with a Leaflet locator map.
 *
 * Reads data/photos.json (built by scripts/build_photo_data.py from each
 * photo's GPS EXIF data). For each entry it drops a marker on the map.
 * Clicking a marker swaps the displayed photo and highlights that marker's
 * label — the map itself never pans or zooms after the initial load.
 */

const DATA_URL = "data/photos.json";
const PHOTOS_DIR = "photos/";

// Fallback center used only if no photo has valid coordinates.
const FALLBACK_CENTER = [35.4415, -106.0605];

async function init() {
  let photos;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`${DATA_URL} responded with ${res.status}`);
    photos = await res.json();
  } catch (err) {
    console.error("Could not load photo data:", err);
    document.body.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif;color:#f2efe6;">' +
      "<h2>Couldn't load photo data</h2>" +
      "<p>This page needs to be viewed over HTTP (e.g. the live GitHub Pages URL, " +
      "or a local server like <code>python3 -m http.server</code>) — opening " +
      "index.html directly by double-clicking it blocks the data/photos.json fetch.</p>" +
      "</div>";
    return;
  }

  const viewerImg = document.getElementById("viewer-img");
  const withCoords = photos.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number"
  );

  // --- Build the map ---
  const center = withCoords.length ? [withCoords[0].lat, withCoords[0].lng] : FALLBACK_CENTER;
  const map = L.map("map", { scrollWheelZoom: false }).setView(center, 17);

  // Esri World Imagery — free satellite basemap, no API key required.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxZoom: 19,
    }
  ).addTo(map);

  // Fit the map to show every point once, on load only. The map does not
  // move again after this — clicking a marker never pans or zooms it.
  if (withCoords.length > 1) {
    const bounds = L.latLngBounds(withCoords.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  // Leaflet measures its container at creation time. If the flexbox layout
  // hasn't finished settling yet (fonts/images loading, etc.) that
  // measurement can be wrong, leaving the map showing only part of its
  // pane. Re-measuring after paint and on resize keeps it filling the
  // pane correctly.
  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener("load", () => map.invalidateSize());
  window.addEventListener("resize", () => map.invalidateSize());

  const markerIcon = (active) =>
    L.divIcon({
      className: "",
      html: `<div class="photo-marker${active ? " active" : ""}"></div>`,
      iconSize: [16, 16],
    });

  const markers = {};

  // --- Build markers ---
  photos.forEach((photo, i) => {
    if (typeof photo.lat === "number" && typeof photo.lng === "number") {
      const marker = L.marker([photo.lat, photo.lng], {
        icon: markerIcon(false),
      })
        .addTo(map)
        .bindTooltip(photo.title, {
          permanent: false,
          direction: "right",
          offset: [10, 0],
          className: "dam-label",
        });
      markers[i] = marker;
    }
  });

  // --- Show a photo + highlight its marker (no map movement) ---
  function setActive(index) {
    const photo = photos[index];
    if (!photo) return;

    viewerImg.src = `${PHOTOS_DIR}${photo.file}`;
    viewerImg.alt = photo.title;

    Object.entries(markers).forEach(([i, marker]) => {
      const isActive = Number(i) === index;
      marker.setIcon(markerIcon(isActive));
      if (isActive) {
        marker.openTooltip();
      } else {
        marker.closeTooltip();
      }
      const tooltipEl = marker.getTooltip()?.getElement();
      if (tooltipEl) tooltipEl.classList.toggle("active", isActive);
    });
  }

  // Show the first photo by default.
  if (photos.length) setActive(0);

  // Clicking a marker swaps the photo and highlights the label —
  // the map stays exactly where it is.
  Object.entries(markers).forEach(([i, marker]) => {
    marker.on("click", () => {
      setActive(Number(i));
    });
  });
}

init();
