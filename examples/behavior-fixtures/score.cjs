'use strict';
// Current entry point; score-v1.cjs remains frozen for historical reproduction.
const rubric = require('./score-v2.cjs');
if (require.main === module) rubric.cli(process.argv[2]);
module.exports = rubric;
