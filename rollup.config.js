import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
	{
		input: 'src/main.js',
		output: {
			name: 'synaptic',
			file: pkg.browser,
			format: 'umd',
		},
		plugins: [
			babel({
				exclude: ['node_modules/**']
			}),
			resolve(),
			commonjs()
		]
	},
	{
		input: 'src/main.js',
		external: ['react', 'prop-types', 'immer'],
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		],
		plugins: [
			babel({
				exclude: ['node_modules/**']
			})
		]
	}
];