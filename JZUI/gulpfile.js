/**
 Gulpfile for gulp-webpack-demo
 created by fwon
*/

var gulp = require('gulp'),
	path = require('path'),
    os = require('os'),
    gutil = require('gulp-util'),
    less = require('gulp-less'),
    concat = require('gulp-concat'),
    gulpOpen = require('gulp-open'),
    uglify = require('gulp-uglify'),
    cssmin = require('gulp-cssmin'),
    md5 = require('gulp-md5-plus'),
    fileinclude = require('gulp-file-include'),
    clean = require('gulp-clean'),
    spriter = require('gulp-css-spriter'),
    base64 = require('gulp-css-base64'),
    webpack = require('webpack'),
    webpackConfig = require('./webpack.config.js'),
    fs = require('fs'),
    gulp_ejs= require('gulp-ejs'),
    connect = require('gulp-connect');

var host = {
    path: '',//dist/
    port: 3000,
    html: 'dist/app/Vue/index.html'
};
 

//mac chrome: "Google chrome", 
var browser = os.platform() === 'linux' ? 'Google chrome' : (
  os.platform() === 'darwin' ? 'Google chrome' : (
  os.platform() === 'win32' ? 'chrome' : 'firefox'));
var pkg = require('./package.json');

//var baseUrl ='http://localhost:3000';
var baseUrl ='../../..';
//编译ejs
gulp.task('ejs', function (done) {
	var Config = require('./src/js/app/JZ/Config');
	var data = {
		   ctx_src: baseUrl + '/src',
		   ctx_dist: baseUrl + '/dist',
		   ctx_modules: Config.node_modules? baseUrl + '/node_modules': baseUrl + '/src/local_modules'
		};
	 gulp.src(['./src/app/incSource/head.inc'])  
        .pipe(gulp_ejs(data))  
        .pipe(gulp.dest('./src/app/inc'))
        .on('end', done);//生成到新目录，然后再用新文件fileinclude
});

gulp.task('ejs2', function (done) {
    var head = fs.readFileSync('./src/app/inc/head.inc','utf8');
	var data = {name:'test'};
	ejs.render(head,data);
});

//将图片拷贝到目标目录
gulp.task('copy:images', function (done) {
    gulp.src(['src/images/**/*']).pipe(gulp.dest('dist/images')).on('end', done);
});

//压缩合并css, css中既有自己写的.less, 也有引入第三方库的.css
gulp.task('lessmin', function (done) {
    gulp.src(['src/css/main.less', 'src/css/*.css'])
        .pipe(less())
        //这里可以加css sprite 让每一个css合并为一个雪碧图
        //.pipe(spriter({}))
        .pipe(concat('style.min.css'))
        .pipe(gulp.dest('dist/css/'))
        .on('end', done);
});

//将js加上10位md5,并修改html中的引用路径，该动作依赖build-js
gulp.task('md5:js', ['build-js'], function (done) {
    gulp.src('dist/js/app/*/*.js')
        .pipe(md5(10, 'dist/app/*/*.html'))
        .pipe(gulp.dest('dist/js/app'))
        .on('end', done);
});

//将css加上10位md5，并修改html中的引用路径，该动作依赖sprite
gulp.task('md5:css', ['sprite'], function (done) {
    gulp.src('dist/css/*.css')
        .pipe(md5(10, 'dist/app/*.html'))
        .pipe(gulp.dest('dist/css'))
        .on('end', done);
});
//用于在html文件中直接include文件
gulp.task('fileinclude', function (done) { 
    gulp.src(['src/app/*/*.html'])
    //gulp.src(['src/app/Table/Table.html'])
        .pipe(fileinclude({
          prefix: '@@',
          basepath: '@file'
        }))
        .pipe(gulp.dest('dist/app'))
        .on('end', done);
        // .pipe(connect.reload())
});
var scriptclone = require('./gulp_plugin/through-script-clone');
gulp.task('scriptclone', ['fileinclude'], function(done) {
    gulp.src(['dist/app/*/*.html'])
    //gulp.src(['dist/app/Table/Table.html']) 
        .pipe(scriptclone())
        .pipe(gulp.dest('dist/app'))
        .on('end', done);
});
//压缩独立插件
gulp.task('script-lib-uglify', function () {
    gulp.src(['src/js/app/JZ/libSource/*.js'])
        .pipe(uglify({
            mangle: true,// 是否修改变量名
            compress: true,//是否完全压缩
            preserveComments: '' //注释
        }))
        .pipe(gulp.dest('src/js/app/JZ/lib'));
});
//合并独立插件
var scriptmerge = require('./gulp_plugin/scriptmerge');
gulp.task('script-lib-merge', ['build-js'], function(done) {
	done();
	return;
    var newFilePath = 'src/js/app/JZ/lib/Bootstrap.Select.js';
    gulp.src('dist/js/app/JZ/JZ.js')
        .pipe(scriptmerge(newFilePath))
        .pipe(gulp.dest('dist/js/app/JZ'))
        .on('end', done);
});
//雪碧图操作，应该先拷贝图片并压缩合并css
gulp.task('sprite', ['copy:images', 'lessmin'], function (done) {
    var timestamp = +new Date();
    gulp.src('dist/css/style.min.css')
        .pipe(spriter({
            spriteSheet: 'dist/images/spritesheet' + timestamp + '.png',
            pathToSpriteSheetFromCSS: '../images/spritesheet' + timestamp + '.png',
            spritesmithOptions: {
                padding: 10
            }
        }))
        .pipe(base64())
        .pipe(cssmin())
        .pipe(gulp.dest('dist/css'))
        .on('end', done);
});

gulp.task('clean', function (done) {
    gulp.src(['dist'])
        .pipe(clean())
        .on('end', done);
});

gulp.task('watch', function (done) {
    gulp.watch('src/**/*', ['copy:images','ejs', 'fileinclude','scriptclone', 'lessmin', 'build-js'])
        .on('end', done);
});

gulp.task('connect', function () {
    console.log('connect------------');
    connect.server({
        root: host.path,
        port: host.port,
        livereload: false
    });
}); 

gulp.task('open', function (done) {
    gulp.src('')  
        .pipe(gulpOpen({
            app: browser,
            uri: 'http://localhost:3000/dist/app/Vue/index.html' 
        }))
        .on('end', done);
});

var myDevConfig = Object.create(webpackConfig);

var devCompiler = webpack(myDevConfig);

//引用webpack对js进行操作
gulp.task("build-js", ['fileinclude'], function(callback) {
    devCompiler.run(function(err, stats) {
        if(err) throw new gutil.PluginError("webpack:build-js", err);
        gutil.log("[webpack:build-js]", stats.toString({
            colors: true
        }));
        callback();
    });
});
gulp.task("webpack", function(callback) {
    var myConfig = Object.create(webpackConfig);
    // run webpack
    webpack(
        // configuration
        myConfig
    , function(err, stats) {
        // if(err) throw new gutil.PluginError("webpack", err);
        // gutil.log("[webpack]", stats.toString({
        //     // output options
        // }));
        callback();
    });
});
//发布devtools
gulp.task('default', ['connect', 'fileinclude','scriptclone', 'md5:css', 'md5:js']);

//开发
//gulp.task('dev', ['connect', 'ejs','copy:images', 'fileinclude','scriptclone', 'lessmin', 'build-js', 'watch']);
gulp.task('dev', ['connect', 'ejs','copy:images', 'fileinclude', 'lessmin', 'build-js','scriptclone','script-lib-uglify','script-lib-merge', 'watch']);
gulp.task('start', ['connect', 'ejs','watch']);