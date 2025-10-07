// This config is specifically for continuing an existing beta sequence
// It does NOT set preRelease to force a new identifier
const baseConfig = require('.release-it.beta.cjs');

module.exports = {
	...baseConfig,
	// Remove the preRelease setting to allow continuing the existing sequence
	preRelease: undefined
};
