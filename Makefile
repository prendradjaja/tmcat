tmcat.js : tmcat.ts
	tsc tmcat.ts --module commonjs

.PHONY : clean
clean :
	rm tmcat.js
