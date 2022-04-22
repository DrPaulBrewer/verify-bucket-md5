/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

const promiseRetry = require('promise-retry');
const verifyFactory = require('verify-common-md5');

const backoffStrategy = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 10000,
  randomize: true
};

const dirRegex = /^.*\//;

function blueprint({
  storage,
  fastFail
}) {
  return {
    promiseChecklistBuffer: ({
      bucket,
      filepath
    }) => {
      return promiseRetry(
        (retry) => (storage.bucket(bucket).file(filepath).download().catch(retry)), backoffStrategy);
    },
    promiseActual: ({
      bucket,
      dir
    }, fname) => {
      return (promiseRetry(
          (retry) => (storage.bucket(bucket).file(dir + fname).get().catch(retry)), backoffStrategy)
        .then((info) => (info[1].md5Hash))
      );
    },
    getPrefix: ({
      bucket,
      filepath
    }) => {
      const dir = dirRegex.exec(filepath)[0];
      const str = "gs://" + bucket + "/" + dir;
      return {
        bucket,
        dir,
        toString: () => (str)
      };
    },
    fastFail
  };
}

function verifyBucketMD5(storage, fastFail) {
  const _verify = verifyFactory(blueprint({
    storage,
    fastFail
  }));
  return function(bucket, filepath) {
    return _verify({
      bucket,
      filepath
    })
  };
}

module.exports = verifyBucketMD5;
