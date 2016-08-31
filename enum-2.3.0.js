!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Enum=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var EnumItem = _interopRequire(_dereq_("./enumItem"));

var isString = _dereq_("./isType").isString;

var indexOf = _dereq_("./indexOf").indexOf;

var isBuffer = _interopRequire(_dereq_("is-buffer"));

var endianness = undefined;
if (window && window.navigator && window.navigator.userAgent && window.navigator.userAgent === "react-native") {
  endianness = "LE"; // for react-native
} else {
  var os = _interopRequire(_dereq_("os"));

  endianness = os.endianness();
}

/**
 * Represents an Enum with enum items.
 * @param {Array || Object}  map     This are the enum items.
 * @param {String || Object} options This are options. [optional]
 */

var Enum = (function () {
  function Enum(map, options) {
    var _this = this;

    _classCallCheck(this, Enum);

    /* implement the "ref type interface", so that Enum types can
     * be used in `node-ffi` function declarations and invokations.
     * In C, these Enums act as `uint32_t` types.
     *
     * https://github.com/TooTallNate/ref#the-type-interface
     */
    this.size = 4;
    this.indirection = 1;

    if (options && isString(options)) {
      options = { name: options };
    }

    this._options = options || {};
    this._options.separator = this._options.separator || " | ";
    this._options.endianness = this._options.endianness || endianness;
    this._options.ignoreCase = this._options.ignoreCase || false;
    this._options.freez = this._options.freez || false;

    this.enums = [];

    if (map.length) {
      this._enumLastIndex = map.length;
      var array = map;
      map = {};

      for (var i = 0; i < array.length; i++) {
        map[array[i]] = Math.pow(2, i);
      }
    }

    for (var member in map) {
      guardReservedKeys(this._options.name, member);
      this[member] = new EnumItem(member, map[member], { ignoreCase: this._options.ignoreCase });
      this.enums.push(this[member]);
    }
    this._enumMap = map;

    if (this._options.ignoreCase) {
      this.getLowerCaseEnums = function () {
        var res = {};
        for (var i = 0, len = this.enums.length; i < len; i++) {
          res[this.enums[i].key.toLowerCase()] = this.enums[i];
        }
        return res;
      };
    }

    if (this._options.name) {
      this.name = this._options.name;
    }

    var isFlaggable = function () {
      for (var i = 0, len = _this.enums.length; i < len; i++) {
        var e = _this.enums[i];

        if (!(e.value !== 0 && !(e.value & e.value - 1))) {
          return false;
        }
      }
      return true;
    };

    this.isFlaggable = isFlaggable();
    if (this._options.freez) {
      this.freezeEnums(); //this will make instances of Enum non-extensible
    }
  }

  /**
   * Returns the appropriate EnumItem key.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {String}                           The get result.
   */

  Enum.prototype.getKey = function getKey(value) {
    var item = this.get(value);
    if (item) {
      return item.key;
    }
  };

  /**
   * Returns the appropriate EnumItem value.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {Number}                           The get result.
   */

  Enum.prototype.getValue = function getValue(key) {
    var item = this.get(key);
    if (item) {
      return item.value;
    }
  };

  /**
   * Returns the appropriate EnumItem.
   * @param  {EnumItem || String || Number} key The object to get with.
   * @return {EnumItem}                         The get result.
   */

  Enum.prototype.get = function get(key, offset) {
    if (key === null || key === undefined) {
      return;
    } // Buffer instance support, part of the ref Type interface
    if (isBuffer(key)) {
      key = key["readUInt32" + this._options.endianness](offset || 0);
    }

    if (EnumItem.isEnumItem(key)) {
      var foundIndex = indexOf.call(this.enums, key);
      if (foundIndex >= 0) {
        return key;
      }
      if (!this.isFlaggable || this.isFlaggable && key.key.indexOf(this._options.separator) < 0) {
        return;
      }
      return this.get(key.key);
    } else if (isString(key)) {

      var enums = this;
      if (this._options.ignoreCase) {
        enums = this.getLowerCaseEnums();
        key = key.toLowerCase();
      }

      if (key.indexOf(this._options.separator) > 0) {
        var parts = key.split(this._options.separator);

        var value = 0;
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];

          value |= enums[part].value;
        }

        return new EnumItem(key, value);
      } else {
        return enums[key];
      }
    } else {
      for (var m in this) {
        if (this.hasOwnProperty(m)) {
          if (this[m].value === key) {
            return this[m];
          }
        }
      }

      var result = null;

      if (this.isFlaggable) {
        for (var n in this) {
          if (this.hasOwnProperty(n)) {
            if ((key & this[n].value) !== 0) {
              if (result) {
                result += this._options.separator;
              } else {
                result = "";
              }
              result += n;
            }
          }
        }
      }

      return this.get(result || null);
    }
  };

  /**
   * Sets the Enum "value" onto the give `buffer` at the specified `offset`.
   * Part of the ref "Type interface".
   *
   * @param  {Buffer} buffer The Buffer instance to write to.
   * @param  {Number} offset The offset in the buffer to write to. Default 0.
   * @param  {EnumItem || String || Number} value The EnumItem to write.
   */

  Enum.prototype.set = function set(buffer, offset, value) {
    var item = this.get(value);
    if (item) {
      return buffer["writeUInt32" + this._options.endianness](item.value, offset || 0);
    }
  };

  /**
   * Define freezeEnums() as a property of the prototype.
   * make enumerable items nonconfigurable and deep freeze the properties. Throw Error on property setter.
   */

  Enum.prototype.freezeEnums = function freezeEnums() {
    function envSupportsFreezing() {
      return Object.isFrozen && Object.isSealed && Object.getOwnPropertyNames && Object.getOwnPropertyDescriptor && Object.defineProperties && Object.__defineGetter__ && Object.__defineSetter__;
    }

    function freezer(o) {
      var props = Object.getOwnPropertyNames(o);
      props.forEach(function (p) {
        if (!Object.getOwnPropertyDescriptor(o, p).configurable) {
          return;
        }

        Object.defineProperties(o, p, { writable: false, configurable: false });
      });
      return o;
    }

    function getPropertyValue(value) {
      return value;
    }

    function deepFreezeEnums(o) {
      if (typeof o !== "object" || o === null || Object.isFrozen(o) || Object.isSealed(o)) {
        return;
      }
      for (var key in o) {
        if (o.hasOwnProperty(key)) {
          o.__defineGetter__(key, getPropertyValue.bind(null, o[key]));
          o.__defineSetter__(key, function throwPropertySetError(value) {
            throw TypeError("Cannot redefine property; Enum Type is not extensible.");
          });
          deepFreezeEnums(o[key]);
        }
      }
      if (Object.freeze) {
        Object.freeze(o);
      } else {
        freezer(o);
      }
    }

    if (envSupportsFreezing()) {
      deepFreezeEnums(this);
    }

    return this;
  };

  /**
   * Returns JSON object representation of this Enum.
   * @return {String} JSON object representation of this Enum.
   */

  Enum.prototype.toJSON = function toJSON() {
    return this._enumMap;
  };

  /**
   * Extends the existing Enum with a New Map.
   * @param  {Array}  map  Map to extend from
   */

  Enum.prototype.extend = function extend(map) {
    if (map.length) {
      var array = map;
      map = {};

      for (var i = 0; i < array.length; i++) {
        var exponent = this._enumLastIndex + i;
        map[array[i]] = Math.pow(2, exponent);
      }

      for (var member in map) {
        guardReservedKeys(this._options.name, member);
        this[member] = new EnumItem(member, map[member], { ignoreCase: this._options.ignoreCase });
        this.enums.push(this[member]);
      }

      for (var key in this._enumMap) {
        map[key] = this._enumMap[key];
      }

      this._enumLastIndex += map.length;
      this._enumMap = map;

      if (this._options.freez) {
        this.freezeEnums(); //this will make instances of new Enum non-extensible
      }
    }
  };

  /**
   * Registers the Enum Type globally in node.js.
   * @param  {String} key Global variable. [optional]
   */

  Enum.register = function register() {
    var key = arguments[0] === undefined ? "Enum" : arguments[0];

    if (!global[key]) {
      global[key] = Enum;
    }
  };

  return Enum;
})();

module.exports = Enum;

// private

var reservedKeys = ["_options", "get", "getKey", "getValue", "enums", "isFlaggable", "_enumMap", "toJSON", "_enumLastIndex"];

function guardReservedKeys(customName, key) {
  if (customName && key === "name" || indexOf.call(reservedKeys, key) >= 0) {
    throw new Error("Enum key " + key + " is a reserved word!");
  }
}
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./enumItem":2,"./indexOf":3,"./isType":4,"is-buffer":6,"os":7}],2:[function(_dereq_,module,exports){
"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _isType = _dereq_("./isType");

var isObject = _isType.isObject;
var isString = _isType.isString;

/**
 * Represents an Item of an Enum.
 * @param {String} key   The Enum key.
 * @param {Number} value The Enum value.
 */

var EnumItem = (function () {

  /*constructor reference so that, this.constructor===EnumItem//=>true */

  function EnumItem(key, value) {
    var options = arguments[2] === undefined ? {} : arguments[2];

    _classCallCheck(this, EnumItem);

    this.key = key;
    this.value = value;

    this._options = options;
    this._options.ignoreCase = this._options.ignoreCase || false;
  }

  /**
   * Checks if the flagged EnumItem has the passing object.
   * @param  {EnumItem || String || Number} value The object to check with.
   * @return {Boolean}                            The check result.
   */

  EnumItem.prototype.has = function has(value) {
    if (EnumItem.isEnumItem(value)) {
      return (this.value & value.value) !== 0;
    } else if (isString(value)) {
      if (this._options.ignoreCase) {
        return this.key.toLowerCase().indexOf(value.toLowerCase()) >= 0;
      }
      return this.key.indexOf(value) >= 0;
    } else {
      return (this.value & value) !== 0;
    }
  };

  /**
   * Checks if the EnumItem is the same as the passing object.
   * @param  {EnumItem || String || Number} key The object to check with.
   * @return {Boolean}                          The check result.
   */

  EnumItem.prototype.is = function is(key) {
    if (EnumItem.isEnumItem(key)) {
      return this.key === key.key;
    } else if (isString(key)) {
      if (this._options.ignoreCase) {
        return this.key.toLowerCase() === key.toLowerCase();
      }
      return this.key === key;
    } else {
      return this.value === key;
    }
  };

  /**
   * Returns String representation of this EnumItem.
   * @return {String} String representation of this EnumItem.
   */

  EnumItem.prototype.toString = function toString() {
    return this.key;
  };

  /**
   * Returns JSON object representation of this EnumItem.
   * @return {String} JSON object representation of this EnumItem.
   */

  EnumItem.prototype.toJSON = function toJSON() {
    return this.key;
  };

  /**
   * Returns the value to compare with.
   * @return {String} The value to compare with.
   */

  EnumItem.prototype.valueOf = function valueOf() {
    return this.value;
  };

  EnumItem.isEnumItem = function isEnumItem(value) {
    return value instanceof EnumItem || isObject(value) && value.key !== undefined && value.value !== undefined;
  };

  return EnumItem;
})();

module.exports = EnumItem;
},{"./isType":4}],3:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
var indexOf = Array.prototype.indexOf || function (find, i /*opt*/) {
  if (i === undefined) i = 0;
  if (i < 0) i += this.length;
  if (i < 0) i = 0;
  for (var n = this.length; i < n; i++) if (i in this && this[i] === find) return i;
  return -1;
};
exports.indexOf = indexOf;
},{}],4:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
var isType = function (type, value) {
  return typeof value === type;
};
exports.isType = isType;
var isObject = function (value) {
  return isType("object", value);
};
exports.isObject = isObject;
var isString = function (value) {
  return isType("string", value);
};
exports.isString = isString;
},{}],5:[function(_dereq_,module,exports){
module.exports = _dereq_('./dist/enum');

},{"./dist/enum":1}],6:[function(_dereq_,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],7:[function(_dereq_,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rb21hc3NodS9kZXZlbG9wbWVudC9lbnVtL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva29tYXNzaHUvZGV2ZWxvcG1lbnQvZW51bS9kaXN0L2VudW0uanMiLCIvVXNlcnMva29tYXNzaHUvZGV2ZWxvcG1lbnQvZW51bS9kaXN0L2VudW1JdGVtLmpzIiwiL1VzZXJzL2tvbWFzc2h1L2RldmVsb3BtZW50L2VudW0vZGlzdC9pbmRleE9mLmpzIiwiL1VzZXJzL2tvbWFzc2h1L2RldmVsb3BtZW50L2VudW0vZGlzdC9pc1R5cGUuanMiLCIvVXNlcnMva29tYXNzaHUvZGV2ZWxvcG1lbnQvZW51bS9mYWtlXzQ3Zjg5ZDQ3LmpzIiwiL1VzZXJzL2tvbWFzc2h1L2RldmVsb3BtZW50L2VudW0vbm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIi9Vc2Vycy9rb21hc3NodS9kZXZlbG9wbWVudC9lbnVtL25vZGVfbW9kdWxlcy9vcy1icm93c2VyaWZ5L2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG52YXIgX2NsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH07XG5cbnZhciBFbnVtSXRlbSA9IF9pbnRlcm9wUmVxdWlyZShyZXF1aXJlKFwiLi9lbnVtSXRlbVwiKSk7XG5cbnZhciBpc1N0cmluZyA9IHJlcXVpcmUoXCIuL2lzVHlwZVwiKS5pc1N0cmluZztcblxudmFyIGluZGV4T2YgPSByZXF1aXJlKFwiLi9pbmRleE9mXCIpLmluZGV4T2Y7XG5cbnZhciBpc0J1ZmZlciA9IF9pbnRlcm9wUmVxdWlyZShyZXF1aXJlKFwiaXMtYnVmZmVyXCIpKTtcblxudmFyIGVuZGlhbm5lc3MgPSB1bmRlZmluZWQ7XG5pZiAod2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3IgJiYgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgJiYgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgPT09IFwicmVhY3QtbmF0aXZlXCIpIHtcbiAgZW5kaWFubmVzcyA9IFwiTEVcIjsgLy8gZm9yIHJlYWN0LW5hdGl2ZVxufSBlbHNlIHtcbiAgdmFyIG9zID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCJvc1wiKSk7XG5cbiAgZW5kaWFubmVzcyA9IG9zLmVuZGlhbm5lc3MoKTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEVudW0gd2l0aCBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtBcnJheSB8fCBPYmplY3R9ICBtYXAgICAgIFRoaXMgYXJlIHRoZSBlbnVtIGl0ZW1zLlxuICogQHBhcmFtIHtTdHJpbmcgfHwgT2JqZWN0fSBvcHRpb25zIFRoaXMgYXJlIG9wdGlvbnMuIFtvcHRpb25hbF1cbiAqL1xuXG52YXIgRW51bSA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW0obWFwLCBvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBFbnVtKTtcblxuICAgIC8qIGltcGxlbWVudCB0aGUgXCJyZWYgdHlwZSBpbnRlcmZhY2VcIiwgc28gdGhhdCBFbnVtIHR5cGVzIGNhblxuICAgICAqIGJlIHVzZWQgaW4gYG5vZGUtZmZpYCBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgYW5kIGludm9rYXRpb25zLlxuICAgICAqIEluIEMsIHRoZXNlIEVudW1zIGFjdCBhcyBgdWludDMyX3RgIHR5cGVzLlxuICAgICAqXG4gICAgICogaHR0cHM6Ly9naXRodWIuY29tL1Rvb1RhbGxOYXRlL3JlZiN0aGUtdHlwZS1pbnRlcmZhY2VcbiAgICAgKi9cbiAgICB0aGlzLnNpemUgPSA0O1xuICAgIHRoaXMuaW5kaXJlY3Rpb24gPSAxO1xuXG4gICAgaWYgKG9wdGlvbnMgJiYgaXNTdHJpbmcob3B0aW9ucykpIHtcbiAgICAgIG9wdGlvbnMgPSB7IG5hbWU6IG9wdGlvbnMgfTtcbiAgICB9XG5cbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9vcHRpb25zLnNlcGFyYXRvciA9IHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yIHx8IFwiIHwgXCI7XG4gICAgdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzID0gdGhpcy5fb3B0aW9ucy5lbmRpYW5uZXNzIHx8IGVuZGlhbm5lc3M7XG4gICAgdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlID0gdGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlIHx8IGZhbHNlO1xuICAgIHRoaXMuX29wdGlvbnMuZnJlZXogPSB0aGlzLl9vcHRpb25zLmZyZWV6IHx8IGZhbHNlO1xuXG4gICAgdGhpcy5lbnVtcyA9IFtdO1xuXG4gICAgaWYgKG1hcC5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX2VudW1MYXN0SW5kZXggPSBtYXAubGVuZ3RoO1xuICAgICAgdmFyIGFycmF5ID0gbWFwO1xuICAgICAgbWFwID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbWFwW2FycmF5W2ldXSA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIG1lbWJlciBpbiBtYXApIHtcbiAgICAgIGd1YXJkUmVzZXJ2ZWRLZXlzKHRoaXMuX29wdGlvbnMubmFtZSwgbWVtYmVyKTtcbiAgICAgIHRoaXNbbWVtYmVyXSA9IG5ldyBFbnVtSXRlbShtZW1iZXIsIG1hcFttZW1iZXJdLCB7IGlnbm9yZUNhc2U6IHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSB9KTtcbiAgICAgIHRoaXMuZW51bXMucHVzaCh0aGlzW21lbWJlcl0pO1xuICAgIH1cbiAgICB0aGlzLl9lbnVtTWFwID0gbWFwO1xuXG4gICAgaWYgKHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSkge1xuICAgICAgdGhpcy5nZXRMb3dlckNhc2VFbnVtcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlcyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5lbnVtcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgIHJlc1t0aGlzLmVudW1zW2ldLmtleS50b0xvd2VyQ2FzZSgpXSA9IHRoaXMuZW51bXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX29wdGlvbnMubmFtZSkge1xuICAgICAgdGhpcy5uYW1lID0gdGhpcy5fb3B0aW9ucy5uYW1lO1xuICAgIH1cblxuICAgIHZhciBpc0ZsYWdnYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBfdGhpcy5lbnVtcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgZSA9IF90aGlzLmVudW1zW2ldO1xuXG4gICAgICAgIGlmICghKGUudmFsdWUgIT09IDAgJiYgIShlLnZhbHVlICYgZS52YWx1ZSAtIDEpKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHRoaXMuaXNGbGFnZ2FibGUgPSBpc0ZsYWdnYWJsZSgpO1xuICAgIGlmICh0aGlzLl9vcHRpb25zLmZyZWV6KSB7XG4gICAgICB0aGlzLmZyZWV6ZUVudW1zKCk7IC8vdGhpcyB3aWxsIG1ha2UgaW5zdGFuY2VzIG9mIEVudW0gbm9uLWV4dGVuc2libGVcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYXBwcm9wcmlhdGUgRW51bUl0ZW0ga2V5LlxuICAgKiBAcGFyYW0gIHtFbnVtSXRlbSB8fCBTdHJpbmcgfHwgTnVtYmVyfSBrZXkgVGhlIG9iamVjdCB0byBnZXQgd2l0aC5cbiAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBnZXQgcmVzdWx0LlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5nZXRLZXkgPSBmdW5jdGlvbiBnZXRLZXkodmFsdWUpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuZ2V0KHZhbHVlKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0ua2V5O1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYXBwcm9wcmlhdGUgRW51bUl0ZW0gdmFsdWUuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IGtleSBUaGUgb2JqZWN0IHRvIGdldCB3aXRoLlxuICAgKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGdldCByZXN1bHQuXG4gICAqL1xuXG4gIEVudW0ucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gZ2V0VmFsdWUoa2V5KSB7XG4gICAgdmFyIGl0ZW0gPSB0aGlzLmdldChrZXkpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGFwcHJvcHJpYXRlIEVudW1JdGVtLlxuICAgKiBAcGFyYW0gIHtFbnVtSXRlbSB8fCBTdHJpbmcgfHwgTnVtYmVyfSBrZXkgVGhlIG9iamVjdCB0byBnZXQgd2l0aC5cbiAgICogQHJldHVybiB7RW51bUl0ZW19ICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBnZXQgcmVzdWx0LlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoa2V5LCBvZmZzZXQpIHtcbiAgICBpZiAoa2V5ID09PSBudWxsIHx8IGtleSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBCdWZmZXIgaW5zdGFuY2Ugc3VwcG9ydCwgcGFydCBvZiB0aGUgcmVmIFR5cGUgaW50ZXJmYWNlXG4gICAgaWYgKGlzQnVmZmVyKGtleSkpIHtcbiAgICAgIGtleSA9IGtleVtcInJlYWRVSW50MzJcIiArIHRoaXMuX29wdGlvbnMuZW5kaWFubmVzc10ob2Zmc2V0IHx8IDApO1xuICAgIH1cblxuICAgIGlmIChFbnVtSXRlbS5pc0VudW1JdGVtKGtleSkpIHtcbiAgICAgIHZhciBmb3VuZEluZGV4ID0gaW5kZXhPZi5jYWxsKHRoaXMuZW51bXMsIGtleSk7XG4gICAgICBpZiAoZm91bmRJbmRleCA+PSAwKSB7XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNGbGFnZ2FibGUgfHwgdGhpcy5pc0ZsYWdnYWJsZSAmJiBrZXkua2V5LmluZGV4T2YodGhpcy5fb3B0aW9ucy5zZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXQoa2V5LmtleSk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpKSB7XG5cbiAgICAgIHZhciBlbnVtcyA9IHRoaXM7XG4gICAgICBpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlKSB7XG4gICAgICAgIGVudW1zID0gdGhpcy5nZXRMb3dlckNhc2VFbnVtcygpO1xuICAgICAgICBrZXkgPSBrZXkudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGtleS5pbmRleE9mKHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yKSA+IDApIHtcbiAgICAgICAgdmFyIHBhcnRzID0ga2V5LnNwbGl0KHRoaXMuX29wdGlvbnMuc2VwYXJhdG9yKTtcblxuICAgICAgICB2YXIgdmFsdWUgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcblxuICAgICAgICAgIHZhbHVlIHw9IGVudW1zW3BhcnRdLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBFbnVtSXRlbShrZXksIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBlbnVtc1trZXldO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBtIGluIHRoaXMpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkobSkpIHtcbiAgICAgICAgICBpZiAodGhpc1ttXS52YWx1ZSA9PT0ga2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1ttXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIHJlc3VsdCA9IG51bGw7XG5cbiAgICAgIGlmICh0aGlzLmlzRmxhZ2dhYmxlKSB7XG4gICAgICAgIGZvciAodmFyIG4gaW4gdGhpcykge1xuICAgICAgICAgIGlmICh0aGlzLmhhc093blByb3BlcnR5KG4pKSB7XG4gICAgICAgICAgICBpZiAoKGtleSAmIHRoaXNbbl0udmFsdWUpICE9PSAwKSB7XG4gICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdGhpcy5fb3B0aW9ucy5zZXBhcmF0b3I7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gXCJcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgKz0gbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHJlc3VsdCB8fCBudWxsKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIEVudW0gXCJ2YWx1ZVwiIG9udG8gdGhlIGdpdmUgYGJ1ZmZlcmAgYXQgdGhlIHNwZWNpZmllZCBgb2Zmc2V0YC5cbiAgICogUGFydCBvZiB0aGUgcmVmIFwiVHlwZSBpbnRlcmZhY2VcIi5cbiAgICpcbiAgICogQHBhcmFtICB7QnVmZmVyfSBidWZmZXIgVGhlIEJ1ZmZlciBpbnN0YW5jZSB0byB3cml0ZSB0by5cbiAgICogQHBhcmFtICB7TnVtYmVyfSBvZmZzZXQgVGhlIG9mZnNldCBpbiB0aGUgYnVmZmVyIHRvIHdyaXRlIHRvLiBEZWZhdWx0IDAuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IHZhbHVlIFRoZSBFbnVtSXRlbSB0byB3cml0ZS5cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGJ1ZmZlciwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5nZXQodmFsdWUpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICByZXR1cm4gYnVmZmVyW1wid3JpdGVVSW50MzJcIiArIHRoaXMuX29wdGlvbnMuZW5kaWFubmVzc10oaXRlbS52YWx1ZSwgb2Zmc2V0IHx8IDApO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVmaW5lIGZyZWV6ZUVudW1zKCkgYXMgYSBwcm9wZXJ0eSBvZiB0aGUgcHJvdG90eXBlLlxuICAgKiBtYWtlIGVudW1lcmFibGUgaXRlbXMgbm9uY29uZmlndXJhYmxlIGFuZCBkZWVwIGZyZWV6ZSB0aGUgcHJvcGVydGllcy4gVGhyb3cgRXJyb3Igb24gcHJvcGVydHkgc2V0dGVyLlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS5mcmVlemVFbnVtcyA9IGZ1bmN0aW9uIGZyZWV6ZUVudW1zKCkge1xuICAgIGZ1bmN0aW9uIGVudlN1cHBvcnRzRnJlZXppbmcoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmlzRnJvemVuICYmIE9iamVjdC5pc1NlYWxlZCAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzICYmIE9iamVjdC5fX2RlZmluZUdldHRlcl9fICYmIE9iamVjdC5fX2RlZmluZVNldHRlcl9fO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZyZWV6ZXIobykge1xuICAgICAgdmFyIHByb3BzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobyk7XG4gICAgICBwcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIGlmICghT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvLCBwKS5jb25maWd1cmFibGUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhvLCBwLCB7IHdyaXRhYmxlOiBmYWxzZSwgY29uZmlndXJhYmxlOiBmYWxzZSB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG87XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlZXBGcmVlemVFbnVtcyhvKSB7XG4gICAgICBpZiAodHlwZW9mIG8gIT09IFwib2JqZWN0XCIgfHwgbyA9PT0gbnVsbCB8fCBPYmplY3QuaXNGcm96ZW4obykgfHwgT2JqZWN0LmlzU2VhbGVkKG8pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGtleSBpbiBvKSB7XG4gICAgICAgIGlmIChvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBvLl9fZGVmaW5lR2V0dGVyX18oa2V5LCBnZXRQcm9wZXJ0eVZhbHVlLmJpbmQobnVsbCwgb1trZXldKSk7XG4gICAgICAgICAgby5fX2RlZmluZVNldHRlcl9fKGtleSwgZnVuY3Rpb24gdGhyb3dQcm9wZXJ0eVNldEVycm9yKHZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVkZWZpbmUgcHJvcGVydHk7IEVudW0gVHlwZSBpcyBub3QgZXh0ZW5zaWJsZS5cIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZGVlcEZyZWV6ZUVudW1zKG9ba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChPYmplY3QuZnJlZXplKSB7XG4gICAgICAgIE9iamVjdC5mcmVlemUobyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmcmVlemVyKG8pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbnZTdXBwb3J0c0ZyZWV6aW5nKCkpIHtcbiAgICAgIGRlZXBGcmVlemVFbnVtcyh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBKU09OIG9iamVjdCByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW0uXG4gICAqIEByZXR1cm4ge1N0cmluZ30gSlNPTiBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtLlxuICAgKi9cblxuICBFbnVtLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VudW1NYXA7XG4gIH07XG5cbiAgLyoqXG4gICAqIEV4dGVuZHMgdGhlIGV4aXN0aW5nIEVudW0gd2l0aCBhIE5ldyBNYXAuXG4gICAqIEBwYXJhbSAge0FycmF5fSAgbWFwICBNYXAgdG8gZXh0ZW5kIGZyb21cbiAgICovXG5cbiAgRW51bS5wcm90b3R5cGUuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKG1hcCkge1xuICAgIGlmIChtYXAubGVuZ3RoKSB7XG4gICAgICB2YXIgYXJyYXkgPSBtYXA7XG4gICAgICBtYXAgPSB7fTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZXhwb25lbnQgPSB0aGlzLl9lbnVtTGFzdEluZGV4ICsgaTtcbiAgICAgICAgbWFwW2FycmF5W2ldXSA9IE1hdGgucG93KDIsIGV4cG9uZW50KTtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgbWVtYmVyIGluIG1hcCkge1xuICAgICAgICBndWFyZFJlc2VydmVkS2V5cyh0aGlzLl9vcHRpb25zLm5hbWUsIG1lbWJlcik7XG4gICAgICAgIHRoaXNbbWVtYmVyXSA9IG5ldyBFbnVtSXRlbShtZW1iZXIsIG1hcFttZW1iZXJdLCB7IGlnbm9yZUNhc2U6IHRoaXMuX29wdGlvbnMuaWdub3JlQ2FzZSB9KTtcbiAgICAgICAgdGhpcy5lbnVtcy5wdXNoKHRoaXNbbWVtYmVyXSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9lbnVtTWFwKSB7XG4gICAgICAgIG1hcFtrZXldID0gdGhpcy5fZW51bU1hcFtrZXldO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9lbnVtTGFzdEluZGV4ICs9IG1hcC5sZW5ndGg7XG4gICAgICB0aGlzLl9lbnVtTWFwID0gbWFwO1xuXG4gICAgICBpZiAodGhpcy5fb3B0aW9ucy5mcmVleikge1xuICAgICAgICB0aGlzLmZyZWV6ZUVudW1zKCk7IC8vdGhpcyB3aWxsIG1ha2UgaW5zdGFuY2VzIG9mIG5ldyBFbnVtIG5vbi1leHRlbnNpYmxlXG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgdGhlIEVudW0gVHlwZSBnbG9iYWxseSBpbiBub2RlLmpzLlxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGtleSBHbG9iYWwgdmFyaWFibGUuIFtvcHRpb25hbF1cbiAgICovXG5cbiAgRW51bS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICAgIHZhciBrZXkgPSBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IFwiRW51bVwiIDogYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKCFnbG9iYWxba2V5XSkge1xuICAgICAgZ2xvYmFsW2tleV0gPSBFbnVtO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gRW51bTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRW51bTtcblxuLy8gcHJpdmF0ZVxuXG52YXIgcmVzZXJ2ZWRLZXlzID0gW1wiX29wdGlvbnNcIiwgXCJnZXRcIiwgXCJnZXRLZXlcIiwgXCJnZXRWYWx1ZVwiLCBcImVudW1zXCIsIFwiaXNGbGFnZ2FibGVcIiwgXCJfZW51bU1hcFwiLCBcInRvSlNPTlwiLCBcIl9lbnVtTGFzdEluZGV4XCJdO1xuXG5mdW5jdGlvbiBndWFyZFJlc2VydmVkS2V5cyhjdXN0b21OYW1lLCBrZXkpIHtcbiAgaWYgKGN1c3RvbU5hbWUgJiYga2V5ID09PSBcIm5hbWVcIiB8fCBpbmRleE9mLmNhbGwocmVzZXJ2ZWRLZXlzLCBrZXkpID49IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFbnVtIGtleSBcIiArIGtleSArIFwiIGlzIGEgcmVzZXJ2ZWQgd29yZCFcIik7XG4gIH1cbn1cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfTtcblxudmFyIF9pc1R5cGUgPSByZXF1aXJlKFwiLi9pc1R5cGVcIik7XG5cbnZhciBpc09iamVjdCA9IF9pc1R5cGUuaXNPYmplY3Q7XG52YXIgaXNTdHJpbmcgPSBfaXNUeXBlLmlzU3RyaW5nO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gSXRlbSBvZiBhbiBFbnVtLlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSAgIFRoZSBFbnVtIGtleS5cbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWx1ZSBUaGUgRW51bSB2YWx1ZS5cbiAqL1xuXG52YXIgRW51bUl0ZW0gPSAoZnVuY3Rpb24gKCkge1xuXG4gIC8qY29uc3RydWN0b3IgcmVmZXJlbmNlIHNvIHRoYXQsIHRoaXMuY29uc3RydWN0b3I9PT1FbnVtSXRlbS8vPT50cnVlICovXG5cbiAgZnVuY3Rpb24gRW51bUl0ZW0oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBFbnVtSXRlbSk7XG5cbiAgICB0aGlzLmtleSA9IGtleTtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG5cbiAgICB0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UgPSB0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UgfHwgZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBmbGFnZ2VkIEVudW1JdGVtIGhhcyB0aGUgcGFzc2luZyBvYmplY3QuXG4gICAqIEBwYXJhbSAge0VudW1JdGVtIHx8IFN0cmluZyB8fCBOdW1iZXJ9IHZhbHVlIFRoZSBvYmplY3QgdG8gY2hlY2sgd2l0aC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlIGNoZWNrIHJlc3VsdC5cbiAgICovXG5cbiAgRW51bUl0ZW0ucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIGhhcyh2YWx1ZSkge1xuICAgIGlmIChFbnVtSXRlbS5pc0VudW1JdGVtKHZhbHVlKSkge1xuICAgICAgcmV0dXJuICh0aGlzLnZhbHVlICYgdmFsdWUudmFsdWUpICE9PSAwO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICBpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVDYXNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmtleS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodmFsdWUudG9Mb3dlckNhc2UoKSkgPj0gMDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmtleS5pbmRleE9mKHZhbHVlKSA+PSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKHRoaXMudmFsdWUgJiB2YWx1ZSkgIT09IDA7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIEVudW1JdGVtIGlzIHRoZSBzYW1lIGFzIHRoZSBwYXNzaW5nIG9iamVjdC5cbiAgICogQHBhcmFtICB7RW51bUl0ZW0gfHwgU3RyaW5nIHx8IE51bWJlcn0ga2V5IFRoZSBvYmplY3QgdG8gY2hlY2sgd2l0aC5cbiAgICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBjaGVjayByZXN1bHQuXG4gICAqL1xuXG4gIEVudW1JdGVtLnByb3RvdHlwZS5pcyA9IGZ1bmN0aW9uIGlzKGtleSkge1xuICAgIGlmIChFbnVtSXRlbS5pc0VudW1JdGVtKGtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmtleSA9PT0ga2V5LmtleTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGtleSkpIHtcbiAgICAgIGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZUNhc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMua2V5LnRvTG93ZXJDYXNlKCkgPT09IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMua2V5ID09PSBrZXk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlID09PSBrZXk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5rZXk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgSlNPTiBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBFbnVtSXRlbS5cbiAgICogQHJldHVybiB7U3RyaW5nfSBKU09OIG9iamVjdCByZXByZXNlbnRhdGlvbiBvZiB0aGlzIEVudW1JdGVtLlxuICAgKi9cblxuICBFbnVtSXRlbS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLmtleTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgdmFsdWUgdG8gY29tcGFyZSB3aXRoLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSB2YWx1ZSB0byBjb21wYXJlIHdpdGguXG4gICAqL1xuXG4gIEVudW1JdGVtLnByb3RvdHlwZS52YWx1ZU9mID0gZnVuY3Rpb24gdmFsdWVPZigpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgfTtcblxuICBFbnVtSXRlbS5pc0VudW1JdGVtID0gZnVuY3Rpb24gaXNFbnVtSXRlbSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIEVudW1JdGVtIHx8IGlzT2JqZWN0KHZhbHVlKSAmJiB2YWx1ZS5rZXkgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZS52YWx1ZSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHJldHVybiBFbnVtSXRlbTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRW51bUl0ZW07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG52YXIgaW5kZXhPZiA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uIChmaW5kLCBpIC8qb3B0Ki8pIHtcbiAgaWYgKGkgPT09IHVuZGVmaW5lZCkgaSA9IDA7XG4gIGlmIChpIDwgMCkgaSArPSB0aGlzLmxlbmd0aDtcbiAgaWYgKGkgPCAwKSBpID0gMDtcbiAgZm9yICh2YXIgbiA9IHRoaXMubGVuZ3RoOyBpIDwgbjsgaSsrKSBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV0gPT09IGZpbmQpIHJldHVybiBpO1xuICByZXR1cm4gLTE7XG59O1xuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBpc1R5cGUgPSBmdW5jdGlvbiAodHlwZSwgdmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gdHlwZTtcbn07XG5leHBvcnRzLmlzVHlwZSA9IGlzVHlwZTtcbnZhciBpc09iamVjdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gaXNUeXBlKFwib2JqZWN0XCIsIHZhbHVlKTtcbn07XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG52YXIgaXNTdHJpbmcgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIGlzVHlwZShcInN0cmluZ1wiLCB2YWx1ZSk7XG59O1xuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2VudW0nKTtcbiIsIi8qIVxuICogRGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBhIEJ1ZmZlclxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iXX0=
(5)
});
