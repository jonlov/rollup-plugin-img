'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var fs__default = _interopDefault(fs);
var path = require('path');
var rollupPluginutils = require('rollup-pluginutils');
var crypto = _interopDefault(require('crypto'));

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var isStream_1 = createCommonjsModule(function (module) {
'use strict';

var isStream = module.exports = function (stream) {
	return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function';
};

isStream.writable = function (stream) {
	return isStream(stream) && stream.writable !== false && typeof stream._write === 'function' && typeof stream._writableState === 'object';
};

isStream.readable = function (stream) {
	return isStream(stream) && stream.readable !== false && typeof stream._read === 'function' && typeof stream._readableState === 'object';
};

isStream.duplex = function (stream) {
	return isStream.writable(stream) && isStream.readable(stream);
};

isStream.transform = function (stream) {
	return isStream.duplex(stream) && typeof stream._transform === 'function' && typeof stream._transformState === 'object';
};
});

var hasha_1 = createCommonjsModule(function (module) {
'use strict';




var hasha = function (input, opts) {
	opts = opts || {};

	var outputEncoding = opts.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	var hash = crypto.createHash(opts.algorithm || 'sha512');

	var update = function (buf) {
		var inputEncoding = typeof buf === 'string' ? 'utf8' : undefined;
		hash.update(buf, inputEncoding);
	};

	if (Array.isArray(input)) {
		input.forEach(update);
	} else {
		update(input);
	}

	return hash.digest(outputEncoding);
};

hasha.stream = function (opts) {
	opts = opts || {};

	var outputEncoding = opts.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	var stream = crypto.createHash(opts.algorithm || 'sha512');
	stream.setEncoding(outputEncoding);
	return stream;
};

hasha.fromStream = function (stream, opts) {
	if (!isStream_1(stream)) {
		return Promise.reject(new TypeError('Expected a stream'));
	}

	opts = opts || {};

	return new Promise(function (resolve, reject) {
		stream
			.on('error', reject)
			.pipe(hasha.stream(opts))
			.on('error', reject)
			.on('finish', function () {
				resolve(this.read());
			});
	});
};

hasha.fromFile = function (fp, opts) { return hasha.fromStream(fs__default.createReadStream(fp), opts); };

hasha.fromFileSync = function (fp, opts) { return hasha(fs__default.readFileSync(fp), opts); };

module.exports = hasha;
});

var svgToJsx = require('svg-to-jsx');
var MagicString = require('magic-string');

var mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

function img(opt) {
    if ( opt === void 0 ) opt = {};

    var extensions = opt.extensions || /\.(png|jpg|jpeg|gif|svg)$/;
    var filter = rollupPluginutils.createFilter(opt.include, opt.exclude);

    return {
        name: 'image',
        load: function load(id) {
            if (!filter(id))
                { return null; }

            var ext = path.extname(id);
            if (!extensions.test(ext))
                { return null; } // not an image

			var outputString = '';

            if (fs.statSync(id).size <= (opt.limit || 8192)) { // use base64
                outputString = "export default \"data:" + (mimeMap[ext]) + ";base64," + (fs.readFileSync(id, 'base64')) + "\"";
            } else { //copy file to distPath
                var output = path.relative('./', opt.output) || '';
                if (!fs.existsSync(output)) {
                    var dirs = output.split('/');
                    for (var i = 0, dir = dirs[0]; i < dirs.length; i++, dir += "/" + (dirs[i])) {
                        if (dir !== '' && !fs.existsSync(dir)) {
                            fs.mkdirSync(dir);
                        }
                    }
                }
                var name = path.basename(id);

                if (opt.hash) {
                    var code = fs.readFileSync(id).toString();
                    var hash = hasha_1(code, {algorithm: 'md5'});
                    name = (path.basename(id, ext)) + "-" + hash + ext;
                }
                var outputFile = output + "/" + name;
                var baseIndex = outputFile.indexOf('/');
                baseIndex = baseIndex !== -1
                    ? baseIndex + 1
                    : 0;
                fs.createReadStream(id).pipe(fs.createWriteStream(outputFile));
                outputString = "export default \"" + (opt._slash
                    ? '/'
                    : '') + (outputFile.slice(baseIndex)) + "\"";
            }

            if (ext === '.svg') {
                var svg = fs.readFileSync(id).toString();
                var s = new MagicString(svg);
                return svgToJsx(svg).then(function(jsx) {
                    var result = 'import {h} from "hyperapp";\nexport const svg = props => ' + jsx.replace(/^<svg/, '<svg {...props}') + ';\n';
                    s.overwrite(0, svg.length, result);
                    return ("" + (s.toString()) + outputString)
                })
            }

			return outputString;
        }
    };
}

module.exports = img;
