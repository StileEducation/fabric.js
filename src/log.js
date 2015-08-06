/**
 * Wrapper around `console.log` (when available)
 * @param {Any} [values] Values to log
 */
fabric.log = function() { };

/**
 * Wrapper around `console.warn` (when available)
 * @param {Any} [values] Values to log as a warning
 */
fabric.warn = function() { };

if (typeof console !== 'undefined') {
  ['log', 'warn'].forEach(function(methodName) {

    if (typeof console[methodName] !== 'undefined' &&
        typeof console[methodName].apply === 'function') {

      fabric[methodName] = function() {
        if (window.Rollbar) {
            var args = Array.prototype.slice.call(arguments);
            Rollbar[methodName](args[0], {args: args});
        }
        return console[methodName].apply(console, arguments);
      };
    }
  });
}
