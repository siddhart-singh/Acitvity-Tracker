'use strict';

const form = document.querySelector('.form');
const mapWeb = document.querySelector('#map');
const formEdit = document.querySelector('.form__edit');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelectorAll('.form__input--type')[1];
const inputDistance = document.querySelectorAll('.form__input--distance')[1];
const inputDuration = document.querySelectorAll('.form__input--duration')[1];
const inputCadence = document.querySelectorAll('.form__input--cadence')[1];
const inputElevation = document.querySelectorAll('.form__input--elevation')[1];
const inputEditType = document.querySelectorAll('.form__input--type')[0];
const inputEditDistance = document.querySelectorAll(
  '.form__input--distance'
)[0];
const inputEditDuration = document.querySelectorAll(
  '.form__input--duration'
)[0];
const inputEditCadence = document.querySelectorAll('.form__input--cadence')[0];
const inputEditElevation = document.querySelectorAll(
  '.form__input--elevation'
)[0];
const filters = document.querySelector('.filters');
const deleteAllButton = document.querySelector('.delete--all');
const sortDistanceButton = document.querySelector('.sort-icon');
const sortType = document.querySelector('.sort--text');
const showAllBtn = document.querySelector('.show__all');
let test = `asc`;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-5);
  click = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    console.log(months[this.date.getMonth()]);
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    }  ${this.date.getDate()}`;
  }

  clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._setDescription();
  }

  get calcPace() {
    return parseFloat((this.duration / this.distance).toFixed(2));
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();
  }
  get calcSpeed() {
    return parseFloat((this.duration / this.distance / 60).toFixed(2));
  }
}

class App {
  #mapZoomLevel = 13;
  #map;
  #mapEvent;
  #workouts = [];
  #shape = [];
  #drawCheck = false;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    window.addEventListener('load', this._getLocalStorageDraw.bind(this));
    mapWeb.addEventListener('click', this._drawShapes.bind(this), {
      once: true,
    });
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this.deleteWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllButton.addEventListener('click', this.reset.bind(this));
    sortDistanceButton.addEventListener('click', this._sortDistance.bind(this));
    showAllBtn.addEventListener('click', this._showAllMarkers.bind(this));
    document.addEventListener('keydown', this._closeForm.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Unable to get the location');
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    this.#map.on('click', function (el) {
      const { lat, lng } = el.latlng;
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this.renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    // this._showDrawKit(this.#map, this.#drawCheck);
    this.#drawCheck = true;
  }

  _showDrawKit(map, check) {
    if (check === true) return;
    // FeatureGroup is to store editable layers
    this.#drawCheck = true;
    this._drawShapes(map, `show`);
  }

  _showFormEdit() {
    formEdit.classList.remove('hidden');
    inputEditDistance.focus();
  }

  _clearForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    inputDistance.focus();
  }

  _clearEditForm() {
    inputEditCadence.value = '';
    inputEditDistance.value = '';
    inputEditDuration.value = '';
    inputEditElevation.value = '';
  }

  _hideForm() {
    this._clearForm();
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = `grid`), 1000);
  }

  _hideFormEdit() {
    this._clearEditForm();
    formEdit.style.display = 'none';
    formEdit.classList.add('hidden');
    setTimeout(() => (formEdit.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(el) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    el.preventDefault();

    //Get data from forum
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //Check if data is valid

    //If workout Running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check data
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs are not valid');

      workout = new Running([lat, lng], distance, duration, cadence);
      this.#workouts.push(workout);
      console.log(workout);
    }

    //If workout Cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs are not valid');

      workout = new Cycling([lat, lng], distance, duration, elevation);
      this.#workouts.push(workout);
    }
    filters.classList.remove('hidden');
    this.renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
    this.#drawCheck = false;
  }

  renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">
    ${workout.description}</h2>
    <div class="utility">
    <ion-icon class="workout__utility workout__edit" name="create-outline"></ion-icon>
    <ion-icon class="workout__utility workout__delete" name="trash-outline"></ion-icon>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type == `running`) {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.calcPace}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
  `;
    }

    if (workout.type === `cycling`) {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.calcSpeed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }

    form.insertAdjacentHTML(`afterend`, html);
  }

  _moveToPopup(el) {
    const workoutEl = el.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
    localStorage.setItem('shapes', JSON.stringify(this.#shape));
    console.log(this.#shape);
  }

  _getLocalStorage() {
    let data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    data.forEach(dataset => {
      if (dataset.type === `running`) {
        const id = dataset.id;
        const date = dataset.date;
        dataset = new Running(
          dataset.coords,
          dataset.distance,
          dataset.duration,
          dataset.cadence
        );
        dataset.id = id;
        dataset.date = date;
      }
      if (dataset.type === `cycling`) {
        const id = dataset.id;
        const date = dataset.date;
        dataset = new Cycling(
          dataset.coords,
          dataset.distance,
          dataset.duration,
          dataset.elevationGain
        );
        dataset.id = id;
        dataset.date = date;
      }
      this.#workouts.push(dataset);
    });
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
    if (this.#workouts.length > 0) {
      filters.classList.remove('hidden');
    }
  }

  _getLocalStorageDraw() {
    let shapes = JSON.parse(localStorage.getItem('shapes'));

    if (!shapes) return;
    shapes.forEach(el => this.#shape.push(el));

    let featureGroup = L.featureGroup();
    this.#map.addLayer(featureGroup);
    let options = {
      position: 'topleft',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#f357a1',
            weight: 10,
          },
        },
        polygon: {
          allowIntersection: true, // Restricts shapes to simple polygons
          drawError: {
            color: '#e1e100', // Color the shape will turn when intersects
            message: "<strong>Oh snap!<strong> you can't draw that!", // Message that will show when intersect
          },
          shapeOptions: {
            color: '#bada55',
          },
        },
        circle: false, // Turns off this drawing tool
        rectangle: {
          shapeOptions: {
            clickable: false,
          },
        },
        marker: {},
      },
      edit: {
        featureGroup: featureGroup, //REQUIRED!!
        remove: true,
      },
    };

    shapes.forEach(el => {
      console.log(el.geometry.type);
      if (el.geometry.type !== 'Circle') {
        featureGroup.addLayer(L.geoJSON(el));
        console.log(L.geoJSON(el));
        return;
      }
    });
    if (this.#shape) {
      filters.classList.remove('hidden');
    }
  }

  reset() {
    if (!this.#workouts) return;

    localStorage.removeItem('workout');
    localStorage.removeItem('shapes');
    this._reloadPage();
  }

  _reloadPage() {
    location.reload();
  }

  deleteWorkout(e) {
    const deleteWorkoutButton = document.querySelectorAll('.workout__delete');
    const element = e.target;
    deleteWorkoutButton.forEach(el => {
      if (element === el) {
        const li = element.closest('.workout');
        this.#workouts.forEach(workout => {
          if (workout.id === li.dataset.id) {
            this.#workouts = this.#workouts.filter(
              item => item.id !== li.dataset.id
            );
            this.reset();
            this._setLocalStorage();
            this._reloadPage();
          }
        });
      }
    });
  }

  _sortDistance() {
    const type = sortType.value;
    console.log(type);
    test = test === `asc` ? `dsc` : `asc`;
    console.log(test);
    if (type === 'distance') {
      if (test === `asc`)
        this.#workouts.sort((a, b) => b.distance - a.distance);
      if (test === `dsc`)
        this.#workouts.sort((a, b) => a.distance - b.distance);
    }
    if (type === `duration`) {
      if (test === `asc`)
        this.#workouts.sort((a, b) => b.duration - a.duration);
      if (test === `dsc`)
        this.#workouts.sort((a, b) => a.duration - b.duration);
    }

    const workoutEntries = document.querySelectorAll('.workout');
    workoutEntries.forEach(entry => entry.remove());
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  _inputFormEdit(workout) {
    inputEditDistance.value = workout.distance;
    inputEditDuration.value = workout.duration;
    if (workout.type === `running`) {
      inputEditCadence.value = workout.cadence;
    }
    if (workout.type === `running`) {
      inputEditElevation.value = workout.elevationGain;
    }
  }

  _editWorkout() {
    console.log(this.#shape);
    const editButton = document.querySelectorAll('.workout__edit');
    editButton.forEach(edit => {
      edit.addEventListener('click', e => {
        const workout = e.target.closest('.workout');

        const details = workout.querySelectorAll('.workout__details');

        let indexEdit;
        let workEdit;
        this.#workouts.forEach((work, index) => {
          if (work.id === workout.dataset.id) {
            indexEdit = index;
            workEdit = work;
          }
        });
        this._clearForm();
        // this._inputFormEdit(workEdit);
        this._showFormEdit();
        this.#drawCheck = true;
        console.log(this.#drawCheck);
        inputEditDistance.value = workEdit.distance;
        inputEditDuration.value = workEdit.duration;
        inputEditCadence.value = workEdit.cadence;
        inputEditElevation.value = workEdit.elevationGain;

        formEdit.addEventListener(
          'submit',
          function (el) {
            el.preventDefault();
            const validInputs = (...inputs) =>
              inputs.every(inp => Number.isFinite(inp));
            const allPositive = (...inputs) => inputs.every(inp => inp > 0);
            const distance = +inputEditDistance.value;
            const duration = +inputEditDuration.value;
            if (workEdit.type === `running`) {
              const cadence = +inputEditCadence.value;

              if (
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
              ) {
                return alert('Enter valid inputs');
              }

              this.#workouts[indexEdit].distance = distance;
              this.#workouts[indexEdit].duration = duration;
              this.#workouts[indexEdit].cadence = cadence;
              details[0].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].distance;
              details[1].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].duration;
              details[3].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].cadence;
            }
            if (workEdit.type === `cycling`) {
              const elevationGain = +inputEditElevation.value;
              if (
                !validInputs(distance, duration, elevationGain) ||
                !allPositive(distance, duration, elevationGain)
              ) {
                return alert('Enter valid inputs');
              }

              this.#workouts[indexEdit].distance = +distance;
              this.#workouts[indexEdit].duration = +duration;
              this.#workouts[indexEdit].elevationGain = +elevationGain;

              details[0].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].distance;
              details[1].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].duration;
              details[3].querySelector(`.workout__value`).textContent =
                this.#workouts[indexEdit].elevationGain;
            }

            this._setLocalStorage();
            this._hideFormEdit();
            this._hideDrawKit(this.#map);
            this.#drawCheck = false;
          }.bind(this)
        );
      });
    });
  }
  _showAllMarkers() {
    let markers = [];
    this.#workouts.forEach(work => markers.push(L.marker(work.coords)));
    console.log(markers);
    console.log(this.#map);
    let group = new L.featureGroup(markers);

    this.#map.fitBounds(group.getBounds(), {
      animate: true,
      padding: [50, 50],
      maxZoom: 13,
      pan: {
        duration: 0.25,
      },
    });
  }

  _closeForm(e) {
    if (e.key == 'Escape') {
      this._hideForm();
      this._hideFormEdit();
      this._hideDrawKit();
    }
  }

  _drawShapes() {
    let shape = [];
    let editableLayers = new L.FeatureGroup();
    this.#map.addLayer(editableLayers);
    let options = {
      position: 'topleft',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#f357a1',
            weight: 10,
          },
        },
        polygon: {
          allowIntersection: true, // Restricts shapes to simple polygons
          drawError: {
            color: '#e1e100', // Color the shape will turn when intersects
            message: "<strong>Oh snap!<strong> you can't draw that!", // Message that will show when intersect
          },
          shapeOptions: {
            color: '#bada55',
          },
        },
        circle: false, // Turns off this drawing tool
        rectangle: {
          shapeOptions: {
            clickable: false,
          },
        },
        marker: {},
      },
      edit: {
        featureGroup: editableLayers, //REQUIRED!!
        remove: true,
      },
    };

    let drawControl = new L.Control.Draw(options);
    this.#map.addControl(drawControl);

    this.#map.on(
      L.Draw.Event.CREATED,
      function (e) {
          let type = e.layerType,
            layer = e.layer;

          if (type === 'marker') {
            layer.bindPopup('A popup!');
          }
          if (type !== 'circle') {
            this.#shape.push(layer.toGeoJSON());
          }

          this._setLocalStorage();
          editableLayers.addLayer(layer);
          console.log(editableLayers);
      }.bind(this)
    );
  }
}
const app = new App();
