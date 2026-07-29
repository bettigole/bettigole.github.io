/*
 * Scrollytelling photo tour with a synced Leaflet locator map.
 *
 * Reads data/photos.json (built by scripts/build_photo_data.py from each
 * photo's GPS EXIF data). For each entry it:
 *   1. Renders an image slide in the #scrolly column.
 *   2. Drops a marker on the map.
 * As the user scrolls, an IntersectionObserver watches which slide is
 * centered in the viewport and highlights + pans to the matching marker.
 */

const DATA_URL = "data/photos.json";
const PHOTOS_DIR = "photos/";

// Fallback center used only if no photo has valid coordinates.
const FALLBACK_CENTER = [35.4415, -106.0605];

async function init() {
  const res = await fetch(DATA_URL);
  const photos = await res.json();

  const scrolly = document.getElementById("scrolly");
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

  if (withCoords.length > 1) {
    const bounds = L.latLngBounds(withCoords.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  const markerIcon = (active) =>
    L.divIcon({
      className: "",
      html: `<div class="photo-marker${active ? " active" : ""}"></div>`,
      iconSize: [16, 16],
    });

  const markers = {};

  // --- Build slides + markers ---
  photos.forEach((photo, i) => {
    const slide = document.createElement("section");
    slide.className = "slide";
    slide.id = `slide-${i}`;
    slide.dataset.index = i;

    slide.innerHTML = `
      <img src="${PHOTOS_DIR}${photo.file}" alt="${photo.title}" loading="lazy" />
    `;
    scrolly.appendChild(slide);

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

  // --- Sync scroll position to map ---
  function setActive(index) {
    document.querySelectorAll(".slide").forEach((el) => el.classList.remove("active"));
    const activeSlide = document.getElementById(`slide-${index}`);
    if (activeSlide) activeSlide.classList.add("active");

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

    const marker = markers[index];
    if (marker) {
      map.flyTo(marker.getLatLng(), map.getZoom(), { duration: 0.6 });
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(Number(entry.target.dataset.index));
        }
      });
    },
    { threshold: 0.55 }
  );

  document.querySelectorAll(".slide").forEach((slide) => observer.observe(slide));

  // Activate the first slide by default.
  if (photos.length) setActive(0);

  // Clicking a marker jumps straight to its slide (no scroll animation)
  // and immediately shows that marker's label.
  Object.entries(markers).forEach(([i, marker]) => {
    marker.on("click", () => {
      setActive(Number(i));
      document.getElementById(`slide-${i}`).scrollIntoView({ behavior: "auto" });
    });
  });
}

init();
