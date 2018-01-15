(function() {

  if (!CocoTouch) { return; }

  const cocotouch = CocoTouch();
  const connectBtn = document.querySelectorAll('.connect-btn');
  const disconnectBtn = document.querySelectorAll('.disconnect-btn');

  const touched = [0, 0, 0, 0];

  $(connectBtn).on('click', function(evt) {
    evt.stopPropagation();
    cocotouch.connect();
    return false;
  });

  $(disconnectBtn).on('click', function(evt) {
    evt.stopPropagation();
    cocotouch.disconnect();
    return false;
  });

  cocotouch.on('connected', () => {
    $(connectBtn).addClass('hide');
    $(disconnectBtn).removeClass('hide');
  });

  cocotouch.on('disconnected', () => {
    $(disconnectBtn).addClass('hide');
    $(connectBtn).removeClass('hide');
  });

  cocotouch.on('message', (message) => {
    if (!message) return;
    const [prop, value] = message.split(':');
    const index = parseInt(value);
    if (prop.indexOf('touched') != -1 && !PAUSE && !PACMAN_DEAD && !LOCK) {
      KEYDOWN = true;
      touched[index] = 1;
      switch (index) {
        case 0:
          // left;
          movePacman(3);
          break;
        case 1:
          // up;
          movePacman(4);
          break;
        case 2:
          // right;
          movePacman(1);
          break;
        case 3:
          // down bottom
          movePacman(2);
          break;
      }
    } else if (prop.indexOf('released') > 0) {
      touched[index] = 0;
      const hasTouched = touched.filter(item => item == 1).length;
      if (!hasTouched) KEYDOWN = false;
    }
  });
})();