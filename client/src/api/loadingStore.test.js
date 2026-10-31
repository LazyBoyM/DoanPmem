import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginLoading, getPendingRequests, getPendingActions, subscribeLoading } from './loadingStore.js';

test('loading waits for all concurrent requests and finishes each request only once', () => {
    const snapshots = [];
    const unsubscribe = subscribeLoading(() => snapshots.push(getPendingRequests()));
    const finishFirst = beginLoading();
    const finishSecond = beginLoading();
    finishSecond();
    assert.equal(getPendingRequests(), 1);
    finishSecond();
    assert.equal(getPendingRequests(), 1);
    finishFirst();
    assert.equal(getPendingRequests(), 0);
    assert.deepEqual(snapshots, [1, 2, 1, 0]);
    unsubscribe();
    const finish = beginLoading();
    finish();
    assert.deepEqual(snapshots, [1, 2, 1, 0]);
});

test('write operations stay visible until all finish and do not trigger data loading', () => {
    const read = beginLoading();
    const firstAction = beginLoading(true);
    const secondAction = beginLoading(true);
    assert.equal(getPendingRequests(), 1);
    assert.equal(getPendingActions(), 2);
    firstAction();
    firstAction();
    assert.equal(getPendingActions(), 1);
    read();
    assert.equal(getPendingRequests(), 0);
    assert.equal(getPendingActions(), 1);
    secondAction();
    assert.equal(getPendingActions(), 0);
});
