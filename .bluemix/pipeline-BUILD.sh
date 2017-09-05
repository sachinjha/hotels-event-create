#!/bin/bash
# Called by the pipeline from the checkout directory
#npm config delete prefix
#curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash
#. ~/.nvm/nvm.sh
#nvm install 6.9.1
#npm install
#npm run build
mkdir dist
cd EventHandler
npm install
zip -r ../dist/eventhandler.zip *
cd ../onboarding-bootstrap
rm -rf node_modules
npm install 
zip -r ../dist/bootstrap.zip *  
