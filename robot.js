const { map, findFirstCoordinate } = require("./map");

class Robot {
  constructor() {
    this.coordinates = findFirstCoordinate(); // [x, y, z]
    this.mode = 'ручной'; // автоматический, ручной
    this.direction = 'север'; // север +z, юг -z, восток +x, запад -x
    this.health = 10000;
    this.criticalError = false;
    this.criticalErrorInterval = null;
    this.autoModeInterval = null;
  }

  getStationTemperature() {
    let baseTemperature = 0;
    const surfaceType = map[this.coordinates[0]][this.coordinates[1]][this.coordinates[2]]

    switch (surfaceType) {
      case "воздух":
        baseTemperature = 20;
        break;
      case "почва":
        baseTemperature = 15;
        break;
      case "вода":
        baseTemperature = 10;
        break;
      case "кислотная поверхность":
        baseTemperature = 100;
        break;
      default:
        baseTemperature = 20;
    }

    const randomTemperatureChange = Math.random() * 5 - 2.5;

    const temperature = baseTemperature + randomTemperatureChange;

    return temperature;
  }

  move(direction, steps) {
    const current_z = this.coordinates[1];
    let future_coordinates = [...this.coordinates];

    switch (direction) {
      case 'север':
        future_coordinates[2] += steps;
        break;
      case 'юг':
        future_coordinates[2] -= steps;
        break;
      case 'восток':
        future_coordinates[0] += steps;
        break;
      case 'запад':
        future_coordinates[0] -= steps;
        break;
    }

    if (future_coordinates[0] < 0 || future_coordinates[0] >= map.length) {
      return;
    }

    if (future_coordinates[2] < 0 || future_coordinates[2] >= map[0][0].length) {
      return;
    }

    if (map[future_coordinates[0]][future_coordinates[2]][future_coordinates[1]] !== 'воздух') {
      future_coordinates[1] = current_z + 1;
      if (map[future_coordinates[0]][future_coordinates[2]][future_coordinates[1]] !== 'воздух') {
        return;
      }
    } 

    // ищем землю
    while (future_coordinates[1] >= 0 && map[future_coordinates[0]][future_coordinates[2]][future_coordinates[1]] === 'воздух') {
      future_coordinates[1]--;
    }
    future_coordinates[1]++;

    if (future_coordinates[1] === 0) {
      return;
    }

    if (current_z - future_coordinates[1] > 3) {
      const delta = current_z - future_coordinates[1];
      this.health -= delta * 100;
    }
    
    // В зависимости от поверхности изменяем координаты с задержкой
    switch (this.getCurrentLocation()) {
      case 'песок':
        setTimeout(() => {
          this.coordinates = future_coordinates;
        }, 5000);
        break;
      case 'кислотная поверхность':
        setTimeout(() => {
          this.coordinates = future_coordinates;
        }, 5000);
        break;
      case 'вода':
        setTimeout(() => {
          this.coordinates = future_coordinates;
        }, 10000);
        break;
      default:
        this.coordinates = future_coordinates;
    }
  }

  moveForward() {
    this.move(this.direction, 1);
  }

  moveBackward() {
    this.move(this.direction, -1);
  }

  moveLeft() {
    this.move(this.direction, -1);
    this.direction = { 'север': 'запад', 'юг': 'восток', 'восток': 'север', 'запад': 'юг' }[this.direction];
  }

  moveRight() {
    this.move(this.direction, 1);
    this.direction = { 'север': 'восток', 'юг': 'запад', 'восток': 'север', 'запад': 'юг' }[this.direction];
  }

  turnLeft() {
    this.direction = { 'север': 'запад', 'юг': 'восток', 'восток': 'север', 'запад': 'юг' }[this.direction];
  }

  turnRight() {
    this.direction = { 'север': 'восток', 'юг': 'запад', 'восток': 'север', 'запад': 'юг' }[this.direction];
  }

  changeMode() {
    this.mode = this.mode === 'ручной' ? 'автоматический' : 'ручной';
    if (this.mode === 'автоматический') {
      this.autoModeInterval = setInterval(() => {
        const nearLocations = this.getNearLocation(5);
        const location = this.getCurrentLocation();
        if (location === 'вода') {
          this.moveForward();
          return;
        }
        if (location === 'кислотная поверхность') {
          this.moveBackward();
          return;
        }
        if (nearLocations.length === 0) {
          return;
        }
        const randomLocation = nearLocations[Math.floor(Math.random() * nearLocations.length)];
        const [x, y, z] = randomLocation.coordinates;
        if (x > this.coordinates[0]) {
          this.direction = 'восток';
        } else if (x < this.coordinates[0]) {
          this.direction = 'запад';
        } else if (y > this.coordinates[2]) {
          this.direction = 'север';
        } else if (y < this.coordinates[2]) {
          this.direction = 'юг';
        }
        this.moveForward();
      }, 1000);
    } else {
      clearInterval(this.autoModeInterval);
    }
  }

  getNearLocation(radius) {
    const [x, y, z] = this.coordinates;
    const nearLocations = [];
    for (let i = x - radius; i <= x + radius; i++) {
      for (let j = y - radius; j <= y + radius; j++) {
        for (let k = z - radius; k <= z + radius; k++) {
          if (i >= 0 && j >= 0 && k >= 0 && i < map.length && j < map[0].length && k < map[0][0].length) {
            if (map[i][j][k] === 'воздух') {
              continue;
            }
            nearLocations.push({
              coordinates: [i, k, j],
              location: map[i][j][k],
            });
          }
        }
      }
    }
    return nearLocations;
  }

  getCurrentLocation() {
    return map[this.coordinates[0]][this.coordinates[2]][this.coordinates[1] - 1]
  }

  heal() {
    // восстановление здоровья 10 единиц в секунду до 100
    let counter = 0; 
    const interval = setInterval(() => {
      if (this.health >= 10000) {
        clearInterval(interval);
        return;
      }
      this.health += 10;
      counter++;
      if (counter === 100) {
        clearInterval(interval);
      }
    }, 1000);
  }

  initCriticalError() {
    this.criticalError = true;
    this.criticalErrorInterval = setInterval(() => {
      this.health -= 100;
    }, 1000);
  }

  fixCriticalError() {
    this.criticalError = false;
    clearInterval(this.criticalErrorInterval);
  }

  restart() {
    this.coordinates = findFirstCoordinate(); // [x, y, z]
    this.mode = 'ручной';
    this.direction = 'север'; // юг, запад, восток; север +y, юг -y, восток +x, запад -x
    this.health = 10000;
    this.criticalError = false;
    this.criticalErrorInterval = null;
    this.autoModeInterval = null;
  }

  getState() {
    const location = this.getCurrentLocation();
    if (location === 'кислотная поверхность') {
      this.health -= 10;
    }
    if (location === 'вода') {
      this.health -= 1;
    }

    return {
      coordinates: this.coordinates,
      mode: this.mode,
      direction: this.direction,
      health: this.health,
      temperature: this.getStationTemperature(),
      location: this.getCurrentLocation(),
      nearLocations: this.getNearLocation(5),
      timestamp: Date.now(),
    }
  }
}

module.exports = Robot;