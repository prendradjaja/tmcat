# tmcat

tmcat is a solution to the current lack of multi-file external modules in
[TypeScript][ts].

Currently, TypeScript allows for [multi-file internal modules][mfim], which
are useful for code organization. However, multi-file external modules (which
we'll refer to as MFEMs) are not yet possible. tmcat solves this problem by
concatenating source files to emulate MFEM support. The complication with
doing this is translating line numbers in error messages from the TypeScript
compiler: tmcat does this for you.

TODO: write example




[ts]: http://www.typescriptlang.org/
[mfim]: http://www.typescriptlang.org/Handbook#modules-splitting-across-files
