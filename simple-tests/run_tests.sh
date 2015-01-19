#!/bin/sh

# Run simple tests.
# Should give no output if successful.

alias tmcat="../tmcat"

clean () {
    rm -f MyModule.ts
}

# check that .ts file is generated correctly.
clean
tmcat MyModule -c ":"
diff MyModule.ts correct_MyModule.ts

# check that error messages are translated correctly.
clean
tmcat MyModule -c "cat blah.tsc" | diff - blah.tmcat

clean
