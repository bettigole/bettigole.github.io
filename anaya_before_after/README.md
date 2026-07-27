# Trail Restoration Scrollytelling Page

A single-page site: scroll down and the photo panel advances through your
images while a sticky Leaflet map on the right pans to that photo's GPS
location and highlights its pin.

## Structure

```
index.html              page shell
style.css                styling
script.js                builds slides + map from data/photos.json
photos/                  your images live here
data/photos.json         one entry per photo: file, lat, lng, title, caption
scripts/build_photo_data.py   regenerates photos.json from EXIF GPS data
```

## Adding or changing photos

1. Drop new image files into `photos/` (name them so they sort in the
   order you want them to appear, e.g. `site-04.jpg`, `site-05.jpg`).
2. Run:
   ```
   pip install Pillow --break-system-packages   # first time only
   python3 scripts/build_photo_data.py
   ```
   This reads GPS EXIF from each photo and updates `data/photos.json`,
   adding new entries and leaving your existing titles/captions alone.
3. Open `data/photos.json` and fill in the `title` and `caption` fields
   for anything new.
4. If a photo has no GPS EXIF data, the script will flag it — add `lat`/
   `lng` by hand in `data/photos.json`, or leave them `null` and that
   photo just won't get a map marker (it still shows in the scroll).

## Running locally

From this folder:
```
python3 -m http.server 8000
```
Then open http://localhost:8000

(Needs to be served over HTTP, not opened as a `file://` URL — the page
fetches `data/photos.json`, which browsers block for local files.)

## Publishing on GitHub Pages

1. Push this whole folder to a GitHub repo.
2. Repo Settings → Pages → set source to the branch/folder you pushed.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

## Customizing

- Colors/fonts: edit the `:root` variables at the top of `style.css`.
- Map basemap: swap the tile URL in `script.js` (currently plain
  OpenStreetMap) for something like Stamen or Mapbox if you want a
  different look.
- Scroll sensitivity: the `threshold: 0.55` value in the
  `IntersectionObserver` in `script.js` controls how much of a slide
  needs to be visible before it's considered "active."
