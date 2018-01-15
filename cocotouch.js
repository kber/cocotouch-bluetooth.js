(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CocoTouch = factory();
  }
}(this, function() {

  if (!this.navigator.bluetooth) {
    console.log('Web bluetooth api is not supported.')
    return;
  }

  const bluetooth = this.navigator.bluetooth;

  function CocoTouch(options) {
    this.options = options || {
      customDataHandler: false
    };
    this.init();
  }

  Object.assign(CocoTouch.prototype, {

    init: function() {
      this.events = {};
      this.device = null;
      this.data = [];
      this.characteristic = null;
    },

    on: function(eventName, handler) {
      this.events[eventName] = handler.bind(this);
    },

    trigger: function(eventName, args) {
      if (this.events[eventName]) {
        this.events[eventName].apply(this, args);
      }
    },

    onDisconnected: function(device) {
      return (event) => {
        this.trigger('disconnected', [device]);
      };
    },

    onCharacteristicValueChanged: function(c) {
      return (event) => {
        const value = event.target.value;
        this.trigger('characteristicvaluechanged', [value, c]);

        if (this.options.customDataHandler) return;

        for (let i = 0; i < value.byteLength; i++) {
          let val = value.getUint8(i);

          if (val == 0) {
            let message = this.data.map(d => String.fromCharCode(d)).join('');
            this.trigger('message', [message, c]);

            this.data = [];
            continue;
          }
          this.data.push(val);
        }
      };
    },

    connect: function() {
      const that = this;
      return bluetooth
        .requestDevice({
          filters: [{ name: 'CocoTouch' }],
          optionalServices: [65504]
        })
        .then(device => {
          that.device = device;
          return device.gatt.connect().then(server => {
            device.addEventListener('gattserverdisconnected', that.onDisconnected(device).bind(that));
            return server.getPrimaryServices();
          });
        })
        .then(services => {
          return Promise.all(services.map(s => {
            return s.getCharacteristics().then(cs => {
              cs.forEach(c => {
                if (!c.properties.notify) return;
                c.startNotifications().then(_ => {
                  that.characteristic = c;
                  that.trigger('connected', []);
                  c.addEventListener('characteristicvaluechanged', that.onCharacteristicValueChanged(c).bind(that));
                });
              });
              return cs;
            });
          }));
        })
        .then(() => {
          return {
            device: that.device,
            characteristic: that.characteristic
          };
        })
        .catch(err => {
          that.trigger('error', [err])
        });
    },

    disconnect() {
      if (!this.device) {
        return;
      }
      const ret = this.device.gatt.disconnect();
      this.onDisconnected(this.device)(null);

      return ret;
    },

    sendMessage: function(message) {
      if (!this.characteristic) {
        return Promise.resolve(null);
      }

      const val = new Uint8Array(
        message.split('').concat(['\0']).map(ch => ch.charCodeAt(0))
      );

      return this.writeValue(val);
    },

    writeValue: function(value, begin = 0) {
      const totalByteLength = value.byteLength;

      if (begin >= totalByteLength) {
        return Promise.resolve(null);
      }

      const writeRet = this.characteristic.writeValue(
        value.subarray(begin, begin + 50)
      );

      return writeRet.then(ret => {
        return this.writeValue(value, begin + 50);
      });
    }

  });

  return function(options) {
    return new CocoTouch(options);
  };
}));
