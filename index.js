
'use strict';

/**
 * Module dependencies.
 */

const render = require('co-render');
const http = require('http');
const serializeError = require('serialize-error');

/**
 * Expose `error`.
 */

module.exports = error;

/**
 * Error middleware.
 *
 *  - `template` defaults to ./error.html
 *
 * @param {Object} opts
 * @api public
 */

function error(opts) {
  opts = opts || {};

  const engine = opts.engine || 'lodash';

  // template
  const path = opts.template || __dirname + '/error.html';

  // env
  const env = process.env.NODE_ENV || 'development';

  var cache = opts.cache;
  if (null == cache) cache = 'development' != env;

  return function *error(next){
    try {
      yield next;
      if (404 == this.response.status && !this.response.body) this.throw(404);
    } catch (err) {
      this.status = err.status || 500;

      // application
      this.app.emit('error', err, this);

      // accepted types
      switch (this.accepts('html', 'text', 'json')) {
        case 'text':
          this.type = 'text/plain';
          if ('development' == env) this.body = err.message
          else if (err.expose) this.body = err.message
          else throw err;
          break;

        case 'json':
          this.type = 'application/json';
          let isDevelopment = (
            this.isDeveloper ||
            'development' == env ||
            this.request.origin.includes('staging') ||
            this.request.origin.includes('sandbox') ||
            this.request.origin === 'localhost' ||
            this.request.origin === '127.0.0.1'
          );
          if (isDevelopment) this.body = {
            error: serializeError(err),
            env: env,
            ctx: this
          };
          else if (err.expose) this.body = { error: err.message }
          else this.body = { error: http.STATUS_CODES[this.status] }
          break;

        case 'html':
          this.type = 'text/html';
          this.body = yield render(path, {
            engine: engine,
            cache: cache,
            env: env,
            ctx: this,
            request: this.request,
            response: this.response,
            error: err.message,
            stack: err.stack,
            status: this.status,
            code: err.code
          });
          break;
      }
    }
  }
}
