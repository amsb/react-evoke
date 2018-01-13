import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
	{
		entry: 'src/main.js',
		dest: pkg.browser,
		format: 'umd',
		moduleName: 'synaptic',
		plugins: [
			babel({
				exclude: ['node_modules/**']
			}),
			resolve(),
			commonjs()
		]
	},
	{
		entry: 'src/main.js',
		external: ['react', 'prop-types'],
		targets: [
			{ dest: pkg.main, format: 'cjs' },
			{ dest: pkg.module, format: 'es' }
		],
		plugins: [
			babel({
				exclude: ['node_modules/**']
			})
		]
	}
];