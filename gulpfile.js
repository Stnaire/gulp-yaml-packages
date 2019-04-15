(function() {
    // If you encounter this error:
    // (node:14364) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 error listeners added. Use emitter.setMaxListeners() to increase limit
    // You can uncomment the following line for an ugly fix:
    // require('events').EventEmitter.prototype._maxListeners = 100;
    
    var gulp = require('gulp');
    var loader = require('gulp-yaml-packages');
    var tasks = loader.load(__dirname+'/app/config/minimalist-demo-packages/app.packages.yml', gulp);
    
    gulp.task('myCustomTask', function(cb) {
        // Do some other work.
        cb();
    });
    
    gulp.task('default', gulp.series.call(gulp, ['myCustomTask'].concat(tasks)));
})();
