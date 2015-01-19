tmcat.js : tmcat.ts
	tsc tmcat.ts --module commonjs

.PHONY : clean tests runtests
clean :
	rm tmcat.js

tests :
	tsc simple-tests/test.ts --module commonjs

runtests :
	cd simple-tests; ../node_modules/mocha/bin/mocha test.js
