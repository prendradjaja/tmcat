tmcat.js : tmcat.ts
	tsc tmcat.ts --module commonjs

.PHONY : clean tests runtests
clean :
	rm tmcat.js

tests :
	tsc tests/test.ts --module commonjs

runtests :
	cd tests; ../node_modules/mocha/bin/mocha test.js
