# verify-bucket-md5



[![Build Status](https://travis-ci.org/DrPaulBrewer/verify-bucket-md5.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/verify-bucket-md5)

Compare the md5 metadata of files in a Google Cloud Storage [tm] bucket against an md5.json file also stored in the bucket.

Returns a Promise resolving to [ true|false,  [goodFileList], [badFileList], {file:err} , md5jsonDirname]

`true|false` is overall status

`goodFileList` is an Array of 0 or more files where the md5 listed in md5.json matches the metadata md5 in Google Cloud Storage

`badFileList` is an Array of 0 or more files where the md5 listed in md5.json did not match the metadata md5 in Google Cloud Storage

`{file:err}` contains exceptions reported when trying to access the files listed in md5.json.  For instance, a file might not exist in the bucket.

md5jsonDirname is the "directory" portion of the path of the md5.json file

Files in the badFileList have been modified from the md5 reported in md5.json

Note that files that are not listed in the md5.json file will not be reported in any list and do not invalidate the overall status.

An Error will be thrown if the md5.json file does not exist in the bucket at the specified path.

## Importing and Setup

On Google platforms:

    const storage = require('@google-cloud/storage')();

On other platforms: set up your API key, see [relevant docs](https://www.npmjs.com/package/@google-cloud/storage)

**Pass the storage object** when setting up

    const verifyBucketMD5 = require('verify-bucket-md5')(storage);

## Usage

`verifyBucketMD5` returns a `Promise` to the results of the testing

    verifyBucketMD5(bucket, '/path/in/the/bucket/to/md5.json')
    .then(function(status){
	// status[0] is either true or false, reflecting overall md5 test status
	// status[1] is an Array of filenames from md5.json that passed the md5 check
	// status[2] is an Array of filenames from md5.json that failed the md5 check
	// status[3] is an Object whose keys are the filesnames where exceptions were reported in accessing md5 metadata
	//                   and  whose values are the exceptions
	// status[4] is the "directory" portion of the path, e.g. gs://somebucket/path/in/the/bucket/to/
	
         if (!status[0]){
             // there was a problem
	     throw new Error("Oh No! There was a problem with file integrity, race conditions, etc.");
	 }
    })
    .then(doYourNextFunction);


## Tests

This module is tested on Travis CI, but you won't be able to run the same tests yourself without some adjustments.

To run the tests in your own environment, change the storage API credentials (projectId, keyFilename) and the bucket name referenced in `./test/index.js`.  

## Copyright

Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC <drpaulbrewer@eaftc.com>

## License

The MIT License

### No relationship to Google, Inc.

Google Cloud Storage[tm] is a trademark of Google, Inc.

This software is not a product of Google Inc.

The author(s) have no relationship to Google, Inc. 
