#!/bin/bash
sed -i 's/caseType,/caseType,\n          isSyllogismComplete: jsonParsed.isSyllogismComplete !== false,\n          missingQuestions: jsonParsed.missingQuestions || [],/g' server.ts
