import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import autoprefixer from 'autoprefixer';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';

// added for bulma
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';

const production = !process.env.ROLLUP_WATCH;
dotenv.config();

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'public/bundle.js',
		globals: {
			'svelte/internal': 'internal',
			'svelte/store': 'store',
		},
	},
	plugins: [
		svelte({
			// enable run-time checks when not in production
			compilerOptions: {
				dev: !production,
			},
			preprocess: sveltePreprocess({
				scss: {
					includePaths: ['src'],
				},
				postcss: {
					plugins: [autoprefixer()],
				},
			}),
		}),
		replace({
			preventAssignment: true,
			values: {
				'process.env.FRIENDSANDFAMILY': JSON.stringify(process.env.FRIENDSANDFAMILY)
			}
		}),
		// added for bulma
		postcss(),
		resolve({
			browser: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/'),
		}),
		commonjs(),
		!production && serve({
			contentBase: 'public',
			historyApiFallback: true,
			host: 'localhost',
			port: 8080,
		}),
		!production && livereload('public'),
		production && terser(),
	],
	watch: {
		clearScreen: false,
	},
};
