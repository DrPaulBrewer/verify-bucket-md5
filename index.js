/* Copyright 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true,node:true */

const promiseRetry = require('promise-retry');

const backoffStrategy = {
    retries: 2,
    factor: 1.5,
    minTimeout:  1000,
    maxTimeout: 10000,
    randomize: true
};


function verifyBucketMD5(storage){
    "use strict";
    return function(bucket,path){
	const dirmatch = /.*\//.exec(path);
	const dirname = (dirmatch)? (dirmatch[0]): '' ;
	function promiseDL(fname){
	    return (promiseRetry(((retry)=>(storage.bucket(bucket).file(fname).download().catch(retry))),
				 backoffStrategy)
		    .then( (buffer)=>(buffer.toString('utf8')) )
		    .then( (jsonString)=>(JSON.parse(jsonString)) )
		   );
	}
	function promiseMD5(fname){
	    const _fname = (/.*\//.test(fname))? fname: (dirname+fname);
	    return promiseRetry(function(retry){
		return (storage.
			bucket(bucket)
			.file(_fname)
			.get()
			.catch(retry)
			    );
	    }, backoffStrategy).then(function(info){
		const md5 = info[1].md5Hash;
		if (!md5) throw new Error("can not determine md5 hash of gs://"+bucket+"/"+_fname);
		return md5;
	    });
	}

	const err = {};
	
	return  (promiseDL(path)
		 .then(function(md5json){
		     const fileList = Object.keys(md5json).sort();
		     function recordError(f){
			 return function(e){
			     err[f]=e;
			 };
		     }
		     const promises = fileList.map(function(f){
			 return promiseMD5(f).catch(recordError(f)); 
		     });
		     return (Promise
			     .all(promises)
			     .then(function(md5list){
				 const status = [false,[],[],err,dirname];
				 md5list.forEach(function(md5, j){
				     if (md5===md5json[fileList[j]])
					 status[1].push(fileList[j]);
				     else
					 status[2].push(fileList[j]);
				 });
				 status[0] = (status[1].length === fileList.length);
				 return status;
			     })
			    );
		 })
		);
    };
}


module.exports = verifyBucketMD5;

