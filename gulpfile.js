(function() {
    var gulp = require('gulp');
    var loader = require('./index.js'); //require('gulp-yaml-packages');
    var tasks = loader.load(__dirname+'/app/config/minimalist-demo-packages/app.packages.yml', gulp);

    gulp.task('myCustomTask', function() {
        // Do some other work.
    });
    gulp.task('default', ['myCustomTask'].concat(tasks));
})();

