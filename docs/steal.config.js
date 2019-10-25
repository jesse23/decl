// config.js
/*
 global
 steal,
 */
steal.config( {
    // paths: {"jquery": "http://code.jquery.com/jquery-1.11.0.min.js"}
    // current stealjs has a bug - baseURL will be overwritten by the path of steal.config
    // Sould be able to play it with config but let us not over engineering this for now
    // baseURL: '../lib/',
    babelOptions: {
        presets: [ 'react' ]
    },
    paths: {
        // github site is using https
        // steal has an issue that by default // will applied as http
        // For now use workaround below to match to https
        '//cdn.jsdelivr.net/*' : 'https://cdn.jsdelivr.net/*.js'
    }
} );

