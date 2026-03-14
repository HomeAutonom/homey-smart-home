'use strict';

const { describe, it, run } = require('./helpers/runner');
const { assert, assertEqual, assertType } = require('./helpers/assert');

const { specs, swaggerUi } = require('../lib/swagger');

describe('swagger', () => {
  it('exports specs as an object', () => {
    assertType(specs, 'object');
  });

  it('specs contain openapi version', () => {
    assertEqual(specs.openapi, '3.0.0');
  });

  it('specs contain info title', () => {
    assertEqual(specs.info.title, 'Smart Home Pro API');
  });

  it('specs contain info version', () => {
    assertType(specs.info.version, 'string');
    assert(specs.info.version.length > 0, 'version should be non-empty');
  });

  it('specs contain servers array', () => {
    assert(Array.isArray(specs.servers), 'servers should be an array');
    assert(specs.servers.length > 0, 'should have at least one server');
    assertEqual(specs.servers[0].url, '/api');
  });

  it('specs contain components with securitySchemes', () => {
    assertType(specs.components, 'object');
    assertType(specs.components.securitySchemes, 'object');
    assertType(specs.components.securitySchemes.bearerAuth, 'object');
  });

  it('bearerAuth scheme is configured correctly', () => {
    const bearer = specs.components.securitySchemes.bearerAuth;
    assertEqual(bearer.type, 'http');
    assertEqual(bearer.scheme, 'bearer');
    assertEqual(bearer.bearerFormat, 'JWT');
  });

  it('specs contain Error schema', () => {
    assertType(specs.components.schemas.Error, 'object');
    assertType(specs.components.schemas.Error.properties.error, 'object');
  });

  it('specs contain SuccessResponse schema', () => {
    assertType(specs.components.schemas.SuccessResponse, 'object');
  });

  it('exports swaggerUi serve and setup functions', () => {
    assertType(swaggerUi.serve, 'object'); // array of middleware
    assertType(swaggerUi.setup, 'function');
  });

  it('specs contain paths object', () => {
    assertType(specs.paths, 'object');
  });
});

run();
