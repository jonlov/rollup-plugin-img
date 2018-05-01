import {
    statSync,
    readFileSync,
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync
} from 'fs';
import {extname, basename, relative} from 'path';
import {createFilter} from 'rollup-pluginutils';
import hasha from 'hasha';

var svgToJsx = require('svg-to-jsx')
var MagicString = require('magic-string')

const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

function img(opt = {}) {
    const extensions = opt.extensions || /\.(png|jpg|jpeg|gif|svg)$/;
    const filter = createFilter(opt.include, opt.exclude);

    return {
        name: 'image',
        load(id) {
            if (!filter(id))
                return null;

            const ext = extname(id);
            if (!extensions.test(ext))
                return null; // not an image

			let outputString = '';

            if (statSync(id).size <= (opt.limit || 8192)) { // use base64
                outputString = `export default "data:${mimeMap[ext]};base64,${readFileSync(id, 'base64')}"`;
            } else { //copy file to distPath
                const output = relative('./', opt.output) || '';
                if (!existsSync(output)) {
                    const dirs = output.split('/');
                    for (let i = 0, dir = dirs[0]; i < dirs.length; i++, dir += `/${dirs[i]}`) {
                        if (dir !== '' && !existsSync(dir)) {
                            mkdirSync(dir)
                        }
                    }
                }
                let name = basename(id);

                if (opt.hash) {
                    const code = readFileSync(id).toString();
                    const hash = hasha(code, {algorithm: 'md5'});
                    name = `${basename(id, ext)}-${hash}${ext}`;
                }
                const outputFile = `${output}/${name}`;
                let baseIndex = outputFile.indexOf('/');
                baseIndex = baseIndex !== -1
                    ? baseIndex + 1
                    : 0;
                createReadStream(id).pipe(createWriteStream(outputFile));
                outputString = `export default "${opt._slash
                    ? '/'
                    : ''}${outputFile.slice(baseIndex)}"`;
            }

            if (ext === '.svg') {
                const svg = readFileSync(id).toString();
                var s = new MagicString(svg)
                return svgToJsx(svg).then(function(jsx) {
                    var result = 'import {h} from "hyperapp";\nexport const svg = props => ' + jsx.replace(/^<svg/, '<svg {...props}') + ';\n'
                    s.overwrite(0, svg.length, result)
                    return `${s.toString()}${outputString}`
                })
            }

			return outputString;
        }
    };
}

export default img;
