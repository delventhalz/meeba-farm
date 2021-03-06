'use strict';

const { expect } = require('chai');
const {
  isObject,
  isEmpty,
  hasProp,
  getNested,
  setNested,
  listKeys,
  listValues,
  fromEntries,
  fromLists,
} = require('./objects.common.js');

describe('Object utils', () => {
  describe('isObject', () => {
    it('should pass objects', () => {
      expect(isObject({ a: 1 })).to.be.true;
      expect(isObject([])).to.be.true;
      expect(isObject(new Date())).to.be.true;
    });

    it('should fail primitives', () => {
      expect(isObject('foo')).to.be.false;
      expect(isObject(7)).to.be.false;
      expect(isObject(true)).to.be.false;
      expect(isObject(undefined)).to.be.false;
    });

    it('should fail null', () => {
      expect(isObject(null)).to.be.false;
    });
  });

  describe('isEmpty', () => {
    it('should pass objects with no properties', () => {
      expect(isEmpty({})).to.be.true;
      expect(isEmpty([])).to.be.true;
      expect(isEmpty(Object.create(Date))).to.be.true;
    });

    it('should fail objects with keys', () => {
      expect(isEmpty({ a: 1 })).to.be.false;
      expect(isEmpty(['foo'])).to.be.false;
    });
  });

  describe('hasProp', () => {
    it('should pass a value with the specified own property', () => {
      expect(hasProp({ foo: 7 }, 'foo')).to.be.true;
      expect(hasProp([1, 2], 0)).to.be.true;
      expect(hasProp('foo', 2)).to.be.true;
    });

    it('should fail a value without the specified own property', () => {
      expect(hasProp({ foo: 7 }, 'bar')).to.be.false;
      expect(hasProp([1, 2], 'foo')).to.be.false;
      expect(hasProp('foo', -1)).to.be.false;
    });

    it('should fail on props inherited from the prototype chain', () => {
      expect(hasProp({}, 'toString')).to.be.false;
      expect(hasProp(new Date(), 'getTime')).to.be.false;
    });
  });

  describe('getNested', () => {
    it('should fetch a nested property from an object', () => {
      const obj = {
        foo: {
          bar: 7,
        },
      };

      expect(getNested(obj, ['foo', 'bar'])).to.equal(7);
    });

    it('should handle nested array indexes', () => {
      const obj = {
        arr: [
          null,
          true,
          {
            bar: 'baz',
          },
        ],
      };

      expect(getNested(obj, ['arr', 2, 'bar'])).to.equal('baz');
    });

    it('should return undefined if the object does not have a property', () => {
      const obj = {};
      expect(getNested(obj, ['foo'])).to.be.undefined;
    });

    it('should accept an optional default value', () => {
      const obj = {};
      expect(getNested(obj, ['foo'], 'bar')).to.equal('bar');
    });

    it('should return the object itself if the path is empty', () => {
      const obj = {};
      expect(getNested(obj, [])).to.equal(obj);
    });

    it('should return undefined if passed a primitive value with a path', () => {
      expect(getNested('foo', ['bar'])).to.be.undefined;
    });

    it('should return the value if passed a primitive with an empty path', () => {
      expect(getNested('foo', [])).to.equal('foo');
    });
  });

  describe('setNested', () => {
    it('should set a nested property on an object', () => {
      const obj = { foo: {} };

      setNested(obj, ['foo', 'bar'], 7);

      expect(obj).to.deep.equal({
        foo: {
          bar: 7,
        },
      });
    });

    it('should overwrite an existing property', () => {
      const foo = { bar: false };
      const obj = { foo };

      setNested(obj, ['foo', 'bar'], true);

      expect(obj.foo.bar).to.equal(true);
      expect(obj.foo).to.equal(foo);
    });

    it('should create nested objects as needed', () => {
      const obj = {};

      setNested(obj, ['foo', 'bar'], 'baz');

      expect(obj.foo).to.be.an('object');
      expect(obj.foo.bar).to.equal('baz');
    });

    it('should overwrite nested primitives with objects as needed', () => {
      const obj = { foo: 7 };

      setNested(obj, ['foo', 'bar'], 'baz');

      expect(obj.foo).to.deep.equal({ bar: 'baz' });
    });

    it('should do nothing if passed an empty path', () => {
      const obj = { foo: 7 };

      setNested(obj, [], 'bar');

      expect(obj).to.deep.equal({ foo: 7 });
    });
  });

  describe('listKeys', () => {
    it('should list the sorted keys of an object', () => {
      const keys = listKeys({ foo: 1, bar: false });
      expect(keys).to.deep.equal(['bar', 'foo']);
    });

    it('should recursively list dot-separated nested keys', () => {
      const keys = listKeys({
        foo: {
          bar: {
            baz: undefined,
          },
        },
        qux: {
          quux: 7,
        },
        corge: {},
      });

      expect(keys).to.deep.equal(['corge', 'foo.bar.baz', 'qux.quux']);
    });
  });

  describe('listValues', () => {
    it('should list the values of an object, sorted by key', () => {
      const keys = listValues({ foo: 1, bar: false });
      expect(keys).to.deep.equal([false, 1]);
    });

    it('should recursively list nested values', () => {
      const keys = listValues({
        foo: {
          bar: {
            baz: undefined,
          },
        },
        qux: {
          quux: 7,
        },
        corge: {},
      });

      expect(keys).to.deep.equal([{}, undefined, 7]);
    });
  });

  describe('fromEntries', () => {
    it('should convert an array of key value pairs to an object', () => {
      expect(fromEntries([['foo', false], ['bar', 7], ['baz', ['corge']]])).to.deep.equal({
        foo: false,
        bar: 7,
        baz: ['corge'],
      });
    });

    it('should set a value to undefined when is missing', () => {
      expect(fromEntries([['foo']])).to.deep.equal({
        foo: undefined,
      });
    });

    it('should throw when passed an invalid entry', () => {
      expect(() => fromEntries([null])).to.throw;
    });
  });

  describe('fromLists', () => {
    it('should convert an array of keys and an array of values to an object', () => {
      expect(fromLists(['foo', 'bar', 'baz'], [false, 7, ['corge']])).to.deep.equal({
        foo: false,
        bar: 7,
        baz: ['corge'],
      });
    });

    it('should set a value to undefined when value is missing', () => {
      expect(fromLists(['foo'], [])).to.deep.equal({
        foo: undefined,
      });
    });

    it('should skip values when key is missing', () => {
      expect(fromLists(['foo'], ['bar', 'baz'])).to.deep.equal({
        foo: 'bar',
      });
    });
  });
});
