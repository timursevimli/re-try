'use strict';

const assert = require('node:assert');
const test = require('node:test');
const recoverify = require('../recoverify.js');

test('should succeed on first try (async)', async () => {
  const task = async () => 'success';
  const wrappedTask = recoverify({ task });

  const result = await wrappedTask();
  assert.strictEqual(result, 'success');
});

test('should succeed on first try (sync)', async () => {
  const task = () => 'success';
  const wrappedTask = recoverify({ task });

  const result = await wrappedTask();
  assert.strictEqual(result, 'success');
});

test('should succeed on second try after one failure', async () => {
  let attempts = 0;
  const task = async () => {
    if (attempts++ < 1) throw new Error('fail');
    return 'success';
  };
  const wrappedTask = recoverify({ task });

  const result = await wrappedTask();
  assert.strictEqual(result, 'success');
});

test('should succeed after recovery', async () => {
  let taskAttempts = 0;
  let recoveryAttempts = 0;
  const task = async () => {
    if (taskAttempts++ < 1) throw new Error('fail');
    return 'success';
  };
  const recovery = async () => {
    if (recoveryAttempts++ < 1) throw new Error('recovery fail');
  };
  const wrappedTask = recoverify({ task, recovery, handleRecovery: true });

  const result = await wrappedTask();
  assert.strictEqual(result, 'success');
});

test('should throw AggregateError after exceeding tryCount', async () => {
  const task = async () => {
    throw new Error('fail');
  };
  const wrappedTask = recoverify({ task, tryCount: 2 });

  await assert.rejects(wrappedTask(), (err) => {
    assert(err instanceof AggregateError);
    assert.strictEqual(err.errors.length, 3); //2 fail + 1 finally
    assert.strictEqual(err.errors[0].message, 'fail');
    assert.strictEqual(err.errors[1].message, 'fail');
    assert.strictEqual(err.errors[2].message, 'Too many tries');
    return true;
  });
});

test('should handle recovery failure and throw AggregateError', async () => {
  const task = async () => {
    throw new Error('fail');
  };
  const recovery = async () => {
    throw new Error('recovery fail');
  };
  const wrappedTask = recoverify({
    task,
    recovery,
    handleRecovery: true,
    tryCount: 2,
  });

  await assert.rejects(wrappedTask(), (err) => {
    assert(err instanceof AggregateError);
    const { errors } = err;
    assert.strictEqual(errors.length, 5); //2 fail + 2 recovery fail + 1 finally
    assert.strictEqual(errors[0].message, 'fail');
    assert.strictEqual(errors[1].message, 'recovery fail');
    assert.strictEqual(errors[2].message, 'fail');
    assert.strictEqual(errors[3].message, 'recovery fail');
    assert.strictEqual(errors[4].message, 'Too many tries');
    return true;
  });
});
