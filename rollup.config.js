import resolve from "rollup-plugin-node-resolve"
import commonjs from 'rollup-plugin-commonjs';
import babel from "rollup-plugin-babel"
import pkg from "./package.json"

export default [
  {
    input: "src/main.js",
    output: {
      name: "ReactEvoke",
	  file: pkg.browser,
	  exports: "named",
	  globals: "React",
      format: "umd"
    },
    plugins: [
      babel({
        exclude: ["node_modules/**"]
      }),
      resolve(),
      commonjs()
    ]
  },
  {
    input: "src/main.js",
    external: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
      ...Object.keys(pkg.devDependencies)
    ],
    output: [{ file: pkg.main, exports: "named", format: "cjs" }],
    plugins: [
      resolve(),
      babel({
        exclude: ["node_modules/**"]
      })
    ]
  }
]
