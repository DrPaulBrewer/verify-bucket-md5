/* jshint node:true,mocha:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true */

const assert = require('assert');
require('should');

const storage = require('@google-cloud/storage')({
    projectId: 'eaftc-open-source-testing',
    keyFilename: './test/storage.json'
});

const pipeToStorage = require('pipe-to-storage')(storage);
const fs = require('fs');

const verifyBucketMD5 = require('../index.js')(storage);

const bucket = 'eaftc-travis-testing';

function fname(path){
    return path.replace(/.*\//,'');
}

function assertFileExists(f, expected){
    return (storage
	    .bucket(bucket)
	    .file(f)
	    .exists()
	    .then(function(data){
		if (!Array.isArray(data)) throw new Error("expected array");
		if (data.length!==1) throw new Error("expected returned array to be length 1, got: "+data.length);
		if (data[0]!==expected) throw new Error("expected exists "+f+" to be "+expected+", got: "+data[0]);
		return (data[0]===expected);
	    })
	   );
}

const file1 = 'verifymd5/hello.txt';
const file2 = 'verifymd5/date.json';
const file3 = 'verifymd5/code.js';
const md5file = 'verifymd5/md5.json';
const dirname = 'verifymd5/';

const files = [file3,file2,file1]; // sort order

// bare fnames for use with relocatable md5.json

const _files = [files, files.map(fname)];
const _file3 = [file3, _files[1][0]];
const _file2 = [file2, _files[1][1]];
const _file1 = [file1, _files[1][2]];

function filesExist(expected){
    return Promise.all(files
		       .concat(md5file)
		       .map((f)=>(assertFileExists(f,expected)))
		      );
}

function suite(relocate){
    return function(){
	it('no files exist', function(){
	    return filesExist(false);
	});
	it('verifyBucketMD5(bucket, /bad/path/to/nonexistent/file) throws error', function(done){
	    verifyBucketMD5(bucket, '/bad/path/to/nonexistent/file').then(()=>(done("test failed")),
									  (e)=>(done()));
	});
	it('create the files for testing', function(){
	    return Promise.all([
		pipeToStorage('Hello World '+Math.random(),bucket,file1),
		pipeToStorage(new Date().toString(),bucket,file2),
		pipeToStorage(()=>(fs.createReadStream("./index.js")), bucket, file3)
	    ]).then(function(info){
		if (info.length!==3)
		    throw new Error("expected info to be array of length 3, got: "+JSON.stringify(info));
		const md5s = {};
		if (relocate) info.forEach( (inf)=>{inf.file = fname(inf.file); } );
		info.forEach( (inf)=>{ md5s[inf.file] = inf.md5; } );
		return pipeToStorage(JSON.stringify(md5s),bucket,md5file);
	    });
	});
	it('all of the files exist', function(){
	    return filesExist(true);
	});
	it('verifyBucketMD5 resolves to [true, [files], [empty], {empty}, dirname to md5.json]', function(){
	    return (verifyBucketMD5(bucket,md5file)
		    .then(function(status){
			status.should.deepEqual([true, _files[+relocate], [], {}, dirname]);
		    })
		   );
	});
	it('delete the file: index.js', function(){
	    return (storage
		    .bucket(bucket)
		    .file(file3)
		    .delete()
		    .then(()=>(assertFileExists(file3,false)))
		   );
	});
	it('verifyBucketMD5 resolves to [false, [file1,file2], [file3], {file3: someError}, dirname to md5.json]', function(){
	    return (verifyBucketMD5(bucket,md5file)
		    .then(function(status){
			assert.equal(status.length,5);
			assert.equal(status[0], false);
			status[1].should.deepEqual([_file2[+relocate],_file1[+relocate]]);
			status[2].should.deepEqual([_file3[+relocate]]);
			assert.ok(typeof(status[3][_file1[+relocate]])==='undefined');
			assert.ok(typeof(status[3][_file2[+relocate]])==='undefined');
			assert.ok(typeof(status[3][_file3[+relocate]])!=='undefined');
			assert.equal(status[4],dirname);
		    })
		   );
	});
	it('replace contents of file 2 without updating md5.json file ', function(){
	    return pipeToStorage("oh no my dear aunt sally",bucket,file2);
	});
	it('verifyBucketMD5 resolves to [false, [file1], [file3,file2], {file3: someError}, dirname to md5.json]', function(){
	    return (verifyBucketMD5(bucket,md5file)
		    .then(function(status){
			assert.equal(status.length,5);
			assert.equal(status[0], false);
			status[1].should.deepEqual([_file1[+relocate]]);
			status[2].should.deepEqual([_file3[+relocate], _file2[+relocate]]);
			assert.ok(typeof(status[3][_file1[+relocate]])==='undefined');
			assert.ok(typeof(status[3][_file2[+relocate]])==='undefined');
			assert.ok(typeof(status[3][_file3[+relocate]])!=='undefined');
		    })
		   );
	});
	it('delete files', function(){
	    return Promise.all([file1,file2,md5file].map( (f)=>(storage.bucket(bucket).file(f).delete()) ));
	});
	it('no files exist', function(){
	    return filesExist(false);
	});
    };
}

describe('verify-bucket-md5:', function(){
    describe(' md5.json with /exact/path/to/file ', suite(false));
    describe(' md5.json with filename.only ', suite(true));
});
