const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('react-icons/si');
const { FaAws } = require('react-icons/fa');

const directory = path.resolve(__dirname, '../public/img/room/tech');
fs.mkdirSync(directory, { recursive: true });
const entries = [
  ['react', icons.SiReact, '#61dafb'], ['dotnet', icons.SiDotnet, '#b497ff'],
  ['linux', icons.SiLinux, '#f3f4f6'], ['aws', FaAws, '#ffb347'],
  ['angular', icons.SiAngular, '#ed5575'], ['nextjs', icons.SiNextdotjs, '#f3f4f6'],
  ['nestjs', icons.SiNestjs, '#ed5575'], ['fastapi', icons.SiFastapi, '#4acbb5'],
  ['docker', icons.SiDocker, '#54b8fa'], ['typescript', icons.SiTypescript, '#65a8e5'],
  ['python', icons.SiPython, '#e9cd6d'], ['mongodb', icons.SiMongodb, '#82bd74'],
  ['postgresql', icons.SiPostgresql, '#8bb3da'], ['kubernetes', icons.SiKubernetes, '#6e9deb'],
];
for (const [name, Icon, color] of entries) {
  fs.writeFileSync(path.join(directory, `${name}.svg`), renderToStaticMarkup(React.createElement(Icon, { xmlns: 'http://www.w3.org/2000/svg', width: 128, height: 128, color })));
}
