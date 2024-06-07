const ZOOM_LEVEL = 'zoom_level';
const ZOOM_CENTER = 'zoom_center';
const POINTS = 'points';

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map')
    .setView(
      JSON.parse(localStorage.getItem(ZOOM_CENTER)) || [37.5665, 126.978],
      +localStorage.getItem(ZOOM_LEVEL) || 13
    )
    .whenReady(() => setTimeout(() => map.invalidateSize(), 100));

  L.control.scale().addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 5,
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const el = {
    reset: document.querySelector('#reset'),
    locations: document.querySelector('#locations'),
    input: {
      lat: document.querySelector('input[name="latitude"]'),
      lng: document.querySelector('input[name="longitude"]'),
    },
    midpoint: {
      box: document.querySelector('#midpoint'),
      lat: document.querySelector('#midpoint-lat'),
      lng: document.querySelector('#midpoint-lng'),
    },
  };

  const markers = [];
  const markerMap = new WeakMap();
  const points = JSON.parse(localStorage.getItem(POINTS)) || [];

  let midpointMarker = null;
  updatePoints();

  el.reset.addEventListener('click', () => {
    localStorage.removeItem(ZOOM_LEVEL);
    localStorage.removeItem(ZOOM_CENTER);
    localStorage.removeItem(POINTS);
    location.reload();
  });

  el.locations.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
      const li = event.target.closest('li');
      const index = Array.from(li.parentElement.children).indexOf(li);
      points.splice(index, 1);
      updatePoints();
    } else if (['LI', 'SPAN'].includes(event.target.tagName)) {
      const li = event.target.closest('li');
      const index = Array.from(li.parentElement.children).indexOf(li);
      const { latitude, longitude } = points[index];
      map.setView([latitude, longitude], map.getZoom());
    }
  });

  el.locations.addEventListener('mouseover', (event) => {
    const li = event.target.closest('li');
    if (li instanceof HTMLLIElement) {
      const index = Array.from(li.parentElement.children).indexOf(li);
      const marker = markers[index];
      marker._icon.style.filter = 'hue-rotate(180deg)';
    }
  });

  el.locations.addEventListener('mouseout', (event) => {
    const li = event.target.closest('li');
    if (li instanceof HTMLLIElement) {
      const index = Array.from(li.parentElement.children).indexOf(li);
      const marker = markers[index];
      marker._icon.style.filter = '';
    }
  });

  el.midpoint.box.addEventListener('click', () => {
    if (midpointMarker) {
      map.setView(midpointMarker.getLatLng(), map.getZoom());
    }
  });

  async function updatePoints() {
    localStorage.setItem(POINTS, JSON.stringify(points));
    markers.forEach((marker) => marker.remove());

    el.locations.innerHTML = '';
    markers.length = 0;

    points.forEach(({ latitude, longitude }) => {
      const marker = L.marker([latitude, longitude]).addTo(map);
      markers.push(marker);

      const li = document.createElement('li');
      const latSpan = document.createElement('span');
      const lngSpan = document.createElement('span');
      const delButton = document.createElement('button');
      latSpan.textContent = `${latitude}`;
      lngSpan.textContent = `${longitude}`;
      delButton.textContent = 'DEL';
      li.appendChild(latSpan);
      li.appendChild(lngSpan);
      li.appendChild(delButton);
      el.locations.appendChild(li);

      markerMap.set(li, marker);
    });

    if (points.length > 1) {
      const { latitude, longitude } = await fetch('/dev/midpoint', {
        method: 'POST',
        body: JSON.stringify({ points }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json());
      el.midpoint.lat.textContent = latitude.toFixed(6);
      el.midpoint.lng.textContent = longitude.toFixed(6);
      if (midpointMarker) {
        midpointMarker.setLatLng([latitude, longitude]).update();
      } else {
        midpointMarker = L.marker([latitude, longitude]).addTo(map);
        midpointMarker._icon.style.filter = 'hue-rotate(270deg)';
      }
    } else {
      el.midpoint.lat.textContent = 'NaN';
      el.midpoint.lng.textContent = 'NaN';
      midpointMarker?.remove();
      midpointMarker = null;
    }
  }

  {
    map.on('mousemove', onMapMousemove);
    function onMapMousemove(event) {
      const { lat, lng } = event.latlng;
      const latitude = lat.toFixed(6);
      const longitude = lng.toFixed(6);

      el.input.lat.value = latitude;
      el.input.lng.value = longitude;
    }

    map.on('click', onMapMouseClick);
    function onMapMouseClick(event) {
      const { lat, lng } = event.latlng;
      const latitude = Number(lat.toFixed(6));
      const longitude = Number(lng.toFixed(6));
      points.push({ latitude, longitude });
      updatePoints();
    }

    map.on('mouseout', onMapMouseout);
    function onMapMouseout() {
      el.input.lat.value = '';
      el.input.lng.value = '';
    }

    map.on('zoomend', () => {
      localStorage.setItem(ZOOM_LEVEL, map.getZoom());
    });

    map.on('moveend', () => {
      localStorage.setItem(ZOOM_CENTER, JSON.stringify(map.getCenter()));
    });
  }

  {
    const form = document.querySelector('form');

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const lat = Number(formData.get('latitude'));
      const lng = Number(formData.get('longitude'));

      const latitude = Number(lat.toFixed(6));
      const longitude = Number(lng.toFixed(6));

      points.push({ latitude, longitude });
      updatePoints();
    });
  }
});
