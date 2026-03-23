const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

if (html.indexOf('</style>') === -1) {
  console.log('No </style> tag. Appending one before </head>');
  html = html.replace('</head>', '</style>\n</head>');
  fs.writeFileSync('public/index.html', html);
  console.log('Fixed unmatched </style> error!');
} else {
  console.log('Already has </style> code.');
}
