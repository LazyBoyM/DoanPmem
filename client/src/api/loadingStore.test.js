import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginLoading, getPendingRequests, subscribeLoading } from './loadingStore.js';

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
